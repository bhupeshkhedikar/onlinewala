
const {
  onCall,
  HttpsError,
} = require("firebase-functions/v2/https");

const {
  defineSecret,
} = require("firebase-functions/params");

const admin =
  require("firebase-admin");

const Razorpay =
  require("razorpay");

const crypto =
  require("crypto");

admin.initializeApp();

const db =
  admin.firestore();

const RAZORPAY_KEY_ID =
  defineSecret("RAZORPAY_KEY_ID");

const RAZORPAY_KEY_SECRET =
  defineSecret("RAZORPAY_KEY_SECRET");
const PARIPRINT_API_KEY = defineSecret("PARIPRINT_API_KEY");
const MIN_WITHDRAWAL = 100;
const MAX_WITHDRAWAL = 50000;

exports.createWalletOrder =
  onCall(
    {
      region: "asia-south1",
      invoker: "public",
      secrets: [
        RAZORPAY_KEY_ID,
        RAZORPAY_KEY_SECRET,
      ],
    },
    async (request) => {
      if (!request.auth) {
        throw new HttpsError(
          "unauthenticated",
          "Please login first."
        );
      }

      const userId =
        request.auth.uid;

      const amount =
        Number(
          request.data?.amount
        );

      if (
        !Number.isFinite(amount)
      ) {
        throw new HttpsError(
          "invalid-argument",
          "Invalid amount."
        );
      }

      if (amount < 10) {
        throw new HttpsError(
          "invalid-argument",
          "Minimum wallet recharge is ₹10."
        );
      }

      if (amount > 50000) {
        throw new HttpsError(
          "invalid-argument",
          "Maximum wallet recharge is ₹50,000."
        );
      }

      if (
        !Number.isInteger(amount)
      ) {
        throw new HttpsError(
          "invalid-argument",
          "Amount must be a whole number."
        );
      }

      let razorpay;

      try {
        razorpay =
          new Razorpay({
            key_id:
              RAZORPAY_KEY_ID.value(),
            key_secret:
              RAZORPAY_KEY_SECRET.value(),
          });
      } catch (error) {
        console.error(
          "Razorpay initialization error:",
          error
        );

        throw new HttpsError(
          "internal",
          "Payment service could not be initialized."
        );
      }

      let rechargeRef;

      try {
        rechargeRef =
          await db
            .collection(
              "walletRechargeRequests"
            )
            .add({
              userId,
              amount,
              currency: "INR",
              status: "created",
              paymentGateway:
                "razorpay",
              createdAt:
                admin.firestore
                  .FieldValue
                  .serverTimestamp(),
              updatedAt:
                admin.firestore
                  .FieldValue
                  .serverTimestamp(),
            });
      } catch (error) {
        console.error(
          "Recharge document creation error:",
          error
        );

        throw new HttpsError(
          "internal",
          "Could not create recharge request."
        );
      }

      let order;

      try {
        order =
          await razorpay.orders.create({
            amount:
              Math.round(
                amount * 100
              ),
            currency: "INR",
            receipt:
              rechargeRef.id,
            notes: {
              userId,
              rechargeId:
                rechargeRef.id,
            },
          });
      } catch (error) {
        console.error(
          "Razorpay order creation error:",
          error
        );

        try {
          await rechargeRef.update({
            status:
              "order_failed",
            error:
              error?.description ||
              error?.message ||
              "Razorpay order creation failed.",
            updatedAt:
              admin.firestore
                .FieldValue
                .serverTimestamp(),
          });
        } catch (
          updateError
        ) {
          console.error(
            "Failed updating recharge failure:",
            updateError
          );
        }

        throw new HttpsError(
          "internal",
          "Unable to create Razorpay payment order."
        );
      }

      try {
        await rechargeRef.update({
          razorpayOrderId:
            order.id,
          status:
            "order_created",
          updatedAt:
            admin.firestore
              .FieldValue
              .serverTimestamp(),
        });
      } catch (error) {
        console.error(
          "Recharge order update error:",
          error
        );

        throw new HttpsError(
          "internal",
          "Could not save payment order."
        );
      }

      return {
        success: true,
        rechargeId:
          rechargeRef.id,
        orderId:
          order.id,
        amount,
        amountInPaise:
          order.amount,
        currency:
          order.currency,
        keyId:
          RAZORPAY_KEY_ID.value(),
      };
    }
  );

exports.verifyWalletPayment =
  onCall(
    {
      region: "asia-south1",
      invoker: "public",
      secrets: [
        RAZORPAY_KEY_ID,
        RAZORPAY_KEY_SECRET,
      ],
    },
    async (request) => {
      if (!request.auth) {
        throw new HttpsError(
          "unauthenticated",
          "Please login first."
        );
      }

      const userId =
        request.auth.uid;

      const {
        rechargeId,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
      } =
        request.data || {};

      if (
        !rechargeId ||
        !razorpayOrderId ||
        !razorpayPaymentId ||
        !razorpaySignature
      ) {
        throw new HttpsError(
          "invalid-argument",
          "Payment verification data is incomplete."
        );
      }

      const rechargeRef =
        db
          .collection(
            "walletRechargeRequests"
          )
          .doc(rechargeId);

      const rechargeSnap =
        await rechargeRef.get();

      if (!rechargeSnap.exists) {
        throw new HttpsError(
          "not-found",
          "Recharge request not found."
        );
      }

      const recharge =
        rechargeSnap.data();

      if (
        recharge.userId !==
        userId
      ) {
        throw new HttpsError(
          "permission-denied",
          "This payment does not belong to you."
        );
      }

      if (
        recharge.razorpayOrderId !==
        razorpayOrderId
      ) {
        throw new HttpsError(
          "invalid-argument",
          "Razorpay order mismatch."
        );
      }

      if (
        recharge.status ===
        "paid"
      ) {
        return {
          success: true,
          alreadyProcessed: true,
          amount:
            Number(
              recharge.amount
            ),
          message:
            "Payment already processed.",
        };
      }

      let generatedSignature;

      try {
        generatedSignature =
          crypto
            .createHmac(
              "sha256",
              RAZORPAY_KEY_SECRET.value()
            )
            .update(
              `${razorpayOrderId}|${razorpayPaymentId}`
            )
            .digest("hex");
      } catch (error) {
        console.error(
          "Signature generation error:",
          error
        );

        throw new HttpsError(
          "internal",
          "Payment signature verification failed."
        );
      }

      const generatedBuffer =
        Buffer.from(
          generatedSignature,
          "utf8"
        );

      const receivedBuffer =
        Buffer.from(
          String(
            razorpaySignature
          ),
          "utf8"
        );

      if (
        generatedBuffer.length !==
        receivedBuffer.length
      ) {
        await rechargeRef.update({
          status:
            "verification_failed",
          razorpayPaymentId,
          updatedAt:
            admin.firestore
              .FieldValue
              .serverTimestamp(),
        });

        throw new HttpsError(
          "permission-denied",
          "Payment signature verification failed."
        );
      }

      const signaturesMatch =
        crypto.timingSafeEqual(
          generatedBuffer,
          receivedBuffer
        );

      if (!signaturesMatch) {
        await rechargeRef.update({
          status:
            "verification_failed",
          razorpayPaymentId,
          updatedAt:
            admin.firestore
              .FieldValue
              .serverTimestamp(),
        });

        throw new HttpsError(
          "permission-denied",
          "Payment signature verification failed."
        );
      }

      const amount =
        Number(
          recharge.amount
        );

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        throw new HttpsError(
          "invalid-argument",
          "Invalid recharge amount."
        );
      }

      const userRef =
        db
          .collection("users")
          .doc(userId);

      const walletTransactionRef =
        db
          .collection(
            "walletTransactions"
          )
          .doc();

      await db.runTransaction(
        async (
          transaction
        ) => {
          const userSnap =
            await transaction.get(
              userRef
            );

          if (!userSnap.exists) {
            throw new HttpsError(
              "not-found",
              "User profile not found."
            );
          }

          const transactionRechargeSnap =
            await transaction.get(
              rechargeRef
            );

          if (
            !transactionRechargeSnap.exists
          ) {
            throw new HttpsError(
              "not-found",
              "Recharge request not found."
            );
          }

          const transactionRecharge =
            transactionRechargeSnap.data();

          if (
            transactionRecharge.status ===
            "paid"
          ) {
            return;
          }

          const userData =
            userSnap.data();

          const currentWallet =
            Number(
              userData.walletBalance ||
              0
            );

          const currentAvailable =
            Number(
              userData.availableBalance ||
              0
            );

          const newWallet =
            currentWallet +
            amount;

          const newAvailable =
            currentAvailable +
            amount;

          transaction.update(
            userRef,
            {
              walletBalance:
                newWallet,
              availableBalance:
                newAvailable,
              updatedAt:
                admin.firestore
                  .FieldValue
                  .serverTimestamp(),
            }
          );

          transaction.set(
            walletTransactionRef,
            {
              userId,
              amount,
              type:
                "RECHARGE",
              direction:
                "CREDIT",
              status:
                "success",
              paymentGateway:
                "razorpay",
              razorpayOrderId,
              razorpayPaymentId,
              referenceId:
                rechargeId,
              description:
                "Wallet Recharge",
              createdAt:
                admin.firestore
                  .FieldValue
                  .serverTimestamp(),
            }
          );

          transaction.update(
            rechargeRef,
            {
              status: "paid",
              razorpayPaymentId,
              razorpaySignature,
              transactionId:
                walletTransactionRef.id,
              paidAt:
                admin.firestore
                  .FieldValue
                  .serverTimestamp(),
              updatedAt:
                admin.firestore
                  .FieldValue
                  .serverTimestamp(),
            }
          );
        }
      );

      return {
        success: true,
        amount,
        message:
          `₹${amount} wallet में successfully add हो गए.`,
      };
    }
  );

const ADMIN_EMAIL =
  "admin@onlinewala.com";

function checkAdmin(
  request
) {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "Admin login required."
    );
  }

  const email =
    String(
      request.auth.token?.email ||
      ""
    )
      .toLowerCase()
      .trim();

  if (
    email !==
    ADMIN_EMAIL
  ) {
    throw new HttpsError(
      "permission-denied",
      "You are not authorized as admin."
    );
  }
}

exports.adminApproveReferral =
  onCall(
    {
      region: "asia-south1",
      invoker: "public",
    },
    async (request) => {
      checkAdmin(request);

      const referralId =
        String(
          request.data?.referralId ||
          ""
        ).trim();

      if (!referralId) {
        throw new HttpsError(
          "invalid-argument",
          "Referral ID is required."
        );
      }

      const referralRef =
        db
          .collection("referrals")
          .doc(referralId);

      let result;

      try {
        result =
          await db.runTransaction(
            async (
              transaction
            ) => {
              const referralSnap =
                await transaction.get(
                  referralRef
                );

              if (
                !referralSnap.exists
              ) {
                throw new HttpsError(
                  "not-found",
                  "Referral not found."
                );
              }

              const referral =
                referralSnap.data();

              const currentStatus =
                String(
                  referral.status ||
                  "pending"
                ).toLowerCase();

              if (
                currentStatus ===
                "confirmed"
              ) {
                return {
                  alreadyProcessed:
                    true,
                  amount:
                    Number(
                      referral.rewardAmount ||
                      0
                    ),
                  referrerId:
                    referral.referrerId,
                };
              }

              if (
                currentStatus ===
                "rejected"
              ) {
                throw new HttpsError(
                  "failed-precondition",
                  "This referral has already been rejected."
                );
              }

              if (
                currentStatus !==
                  "pending" &&
                currentStatus !==
                  "approved"
              ) {
                throw new HttpsError(
                  "failed-precondition",
                  `Referral cannot be approved from status: ${currentStatus}`
                );
              }

              const referrerId =
                referral.referrerId;

              if (!referrerId) {
                throw new HttpsError(
                  "invalid-argument",
                  "Referral referrerId is missing."
                );
              }

              const referrerRef =
                db
                  .collection("users")
                  .doc(referrerId);

              const referrerSnap =
                await transaction.get(
                  referrerRef
                );

              if (
                !referrerSnap.exists
              ) {
                throw new HttpsError(
                  "not-found",
                  "Referrer user account not found."
                );
              }

              const referrer =
                referrerSnap.data();

              const rewardAmount =
                Number(
                  referral.rewardAmount ||
                  referral.reward ||
                  0
                );

              if (
                !Number.isFinite(
                  rewardAmount
                ) ||
                rewardAmount < 10 ||
                rewardAmount > 100
              ) {
                throw new HttpsError(
                  "invalid-argument",
                  "Invalid referral reward amount."
                );
              }

              const currentWallet =
                Number(
                  referrer.walletBalance ||
                  0
                );

              const currentAvailable =
                Number(
                  referrer.availableBalance ||
                  0
                );

              const newAvailable =
                currentAvailable +
                rewardAmount;

              transaction.update(
                referrerRef,
                {
                  walletBalance:
                    currentWallet,
                  availableBalance:
                    newAvailable,
                  updatedAt:
                    admin.firestore
                      .FieldValue
                      .serverTimestamp(),
                }
              );

              const walletTransactionRef =
                db
                  .collection(
                    "walletTransactions"
                  )
                  .doc();

              transaction.set(
                walletTransactionRef,
                {
                  userId:
                    referrerId,
                  amount:
                    rewardAmount,
                  type:
                    "REFERRAL_REWARD",
                  direction:
                    "CREDIT",
                  status:
                    "success",
                  referenceId:
                    referralId,
                  description:
                    "Referral reward approved by admin.",
                  approvedBy:
                    request.auth.uid,
                  approvedByEmail:
                    request.auth.token?.email ||
                    "",
                  createdAt:
                    admin.firestore
                      .FieldValue
                      .serverTimestamp(),
                }
              );

              transaction.update(
                referralRef,
                {
                  status:
                    "confirmed",
                  adminApproved:
                    true,
                  serviceBooked:
                    true,
                  approvedBy:
                    request.auth.uid,
                  approvedByEmail:
                    request.auth.token?.email ||
                    "",
                  approvedAt:
                    admin.firestore
                      .FieldValue
                      .serverTimestamp(),
                  walletTransactionId:
                    walletTransactionRef.id,
                  updatedAt:
                    admin.firestore
                      .FieldValue
                      .serverTimestamp(),
                }
              );

              return {
                alreadyProcessed:
                  false,
                amount:
                  rewardAmount,
                referrerId,
              };
            }
          );
      } catch (error) {
        console.error(
          "Admin approve referral error:",
          error
        );

        if (
          error instanceof
          HttpsError
        ) {
          throw error;
        }

        throw new HttpsError(
          "internal",
          "Could not approve referral."
        );
      }

      return {
        success: true,
        alreadyProcessed:
          result.alreadyProcessed,
        amount:
          result.amount,
        referrerId:
          result.referrerId,
        message:
          result.alreadyProcessed
            ? "Referral was already approved."
            : `Referral approved successfully. ₹${result.amount} is now available for withdrawal.`,
      };
    }
  );

exports.adminRejectReferral =
  onCall(
    {
      region: "asia-south1",
      invoker: "public",
    },
    async (request) => {
      checkAdmin(request);

      const referralId =
        String(
          request.data?.referralId ||
          ""
        ).trim();

      const reason =
        String(
          request.data?.reason ||
          "Referral rejected by admin."
        ).trim();

      if (!referralId) {
        throw new HttpsError(
          "invalid-argument",
          "Referral ID is required."
        );
      }

      const referralRef =
        db
          .collection("referrals")
          .doc(referralId);

      try {
        await db.runTransaction(
          async (
            transaction
          ) => {
            const referralSnap =
              await transaction.get(
                referralRef
              );

            if (
              !referralSnap.exists
            ) {
              throw new HttpsError(
                "not-found",
                "Referral not found."
              );
            }

            const referral =
              referralSnap.data();

            const currentStatus =
              String(
                referral.status ||
                "pending"
              ).toLowerCase();

            if (
              currentStatus ===
              "rejected"
            ) {
              throw new HttpsError(
                "failed-precondition",
                "This referral is already rejected."
              );
            }

            if (
              currentStatus ===
              "confirmed"
            ) {
              throw new HttpsError(
                "failed-precondition",
                "Confirmed referral cannot be rejected."
              );
            }

            const referrerId =
              referral.referrerId;

            if (!referrerId) {
              throw new HttpsError(
                "invalid-argument",
                "Referral referrerId is missing."
              );
            }

            const referrerRef =
              db
                .collection("users")
                .doc(referrerId);

            const referrerSnap =
              await transaction.get(
                referrerRef
              );

            if (
              !referrerSnap.exists
            ) {
              throw new HttpsError(
                "not-found",
                "Referrer account not found."
              );
            }

            const referrer =
              referrerSnap.data();

            const rewardAmount =
              Number(
                referral.rewardAmount ||
                referral.reward ||
                0
              );

            const currentWallet =
              Number(
                referrer.walletBalance ||
                0
              );

            const currentAvailable =
              Number(
                referrer.availableBalance ||
                0
              );

            const safeReward =
              Number.isFinite(
                rewardAmount
              ) &&
              rewardAmount > 0
                ? rewardAmount
                : 0;

            const newWallet =
              Math.max(
                0,
                currentWallet -
                  safeReward
              );

            transaction.update(
              referrerRef,
              {
                walletBalance:
                  newWallet,
                availableBalance:
                  currentAvailable,
                updatedAt:
                  admin.firestore
                    .FieldValue
                    .serverTimestamp(),
              }
            );

            transaction.update(
              referralRef,
              {
                status:
                  "rejected",
                adminApproved:
                  false,
                serviceBooked:
                  false,
                rejectionReason:
                  reason,
                rejectedBy:
                  request.auth.uid,
                rejectedByEmail:
                  request.auth.token?.email ||
                  "",
                rejectedAt:
                  admin.firestore
                    .FieldValue
                    .serverTimestamp(),
                updatedAt:
                  admin.firestore
                    .FieldValue
                    .serverTimestamp(),
              }
            );
          }
        );
      } catch (error) {
        console.error(
          "Admin reject referral error:",
          error
        );

        if (
          error instanceof
          HttpsError
        ) {
          throw error;
        }

        throw new HttpsError(
          "internal",
          "Could not reject referral."
        );
      }

      return {
        success: true,
        referralId,
        message:
          "Referral rejected successfully.",
      };
    }
  );

async function getUserData(
  uid
) {
  const userRef =
    db
      .collection("users")
      .doc(uid);

  const userSnap =
    await userRef.get();

  if (!userSnap.exists) {
    throw new HttpsError(
      "not-found",
      "User profile not found."
    );
  }

  return {
    ref: userRef,
    data:
      userSnap.data(),
  };
}

async function verifyAdmin(
  uid
) {
  const { data } =
    await getUserData(uid);

  if (
    data.role !==
    "admin"
  ) {
    throw new HttpsError(
      "permission-denied",
      "आपको withdrawal manage करने की permission नहीं है."
    );
  }

  return data;
}

exports.createWithdrawal =
  onCall(
    {
      region: "asia-south1",
      invoker: "public",
    },
    async (request) => {
      if (!request.auth) {
        throw new HttpsError(
          "unauthenticated",
          "Please login first."
        );
      }

      const uid =
        request.auth.uid;

      const amount =
        Number(
          request.data?.amount
        );

      const upiId =
        String(
          request.data?.upiId ||
          ""
        )
          .trim()
          .toLowerCase();

      if (
        !Number.isFinite(
          amount
        ) ||
        amount <
          MIN_WITHDRAWAL ||
        amount >
          MAX_WITHDRAWAL
      ) {
        throw new HttpsError(
          "invalid-argument",
          `Withdrawal amount must be between ₹${MIN_WITHDRAWAL} and ₹${MAX_WITHDRAWAL}.`
        );
      }

      if (!upiId) {
        throw new HttpsError(
          "invalid-argument",
          "UPI ID is required."
        );
      }

      const upiRegex =
        /^[a-zA-Z0-9._-]{2,}@[a-zA-Z0-9._-]{2,}$/;

      if (
        !upiRegex.test(
          upiId
        )
      ) {
        throw new HttpsError(
          "invalid-argument",
          "Please enter a valid UPI ID."
        );
      }

      const userRef =
        db
          .collection("users")
          .doc(uid);

      const withdrawalRef =
        db
          .collection("withdrawals")
          .doc();

      await db.runTransaction(
        async (
          transaction
        ) => {
          const userSnap =
            await transaction.get(
              userRef
            );

          if (!userSnap.exists) {
            throw new HttpsError(
              "not-found",
              "User profile not found."
            );
          }

          const userData =
            userSnap.data();

          const availableBalance =
            Number(
              userData.availableBalance ??
              0
            );

          const pendingWithdrawal =
            Number(
              userData.pendingWithdrawal ??
              0
            );

          if (
            availableBalance <
            amount
          ) {
            throw new HttpsError(
              "failed-precondition",
              "Insufficient available balance."
            );
          }

          transaction.update(
            userRef,
            {
              availableBalance:
                availableBalance -
                amount,
              pendingWithdrawal:
                pendingWithdrawal +
                amount,
              updatedAt:
                admin.firestore
                  .FieldValue
                  .serverTimestamp(),
            }
          );

          transaction.set(
            withdrawalRef,
            {
              userId: uid,
              amount,
              currency: "INR",
              upiId,
              status: "pending",
              createdAt:
                admin.firestore
                  .FieldValue
                  .serverTimestamp(),
              updatedAt:
                admin.firestore
                  .FieldValue
                  .serverTimestamp(),
            }
          );
        }
      );

      return {
        success: true,
        withdrawalId:
          withdrawalRef.id,
        amount,
        status:
          "pending",
      };
    }
  );

exports.adminApproveWithdrawal =
  onCall(
    {
      region: "asia-south1",
      invoker: "public",
    },
    async (request) => {
      if (!request.auth) {
        throw new HttpsError(
          "unauthenticated",
          "Admin login required."
        );
      }

      await verifyAdmin(
        request.auth.uid
      );

      const withdrawalId =
        String(
          request.data?.withdrawalId ||
          ""
        ).trim();

      if (!withdrawalId) {
        throw new HttpsError(
          "invalid-argument",
          "Withdrawal ID is required."
        );
      }

      const withdrawalRef =
        db
          .collection(
            "withdrawals"
          )
          .doc(withdrawalId);

      await db.runTransaction(
        async (
          transaction
        ) => {
          const withdrawalSnap =
            await transaction.get(
              withdrawalRef
            );

          if (
            !withdrawalSnap.exists
          ) {
            throw new HttpsError(
              "not-found",
              "Withdrawal request not found."
            );
          }

          const withdrawal =
            withdrawalSnap.data();

          if (
            withdrawal.status ===
            "approved"
          ) {
            return;
          }

          if (
            withdrawal.status !==
            "pending"
          ) {
            throw new HttpsError(
              "failed-precondition",
              "Only pending withdrawals can be approved."
            );
          }

          const userId =
            withdrawal.userId;

          if (!userId) {
            throw new HttpsError(
              "failed-precondition",
              "Withdrawal user ID is missing."
            );
          }

          const userRef =
            db
              .collection("users")
              .doc(userId);

          const userSnap =
            await transaction.get(
              userRef
            );

          if (
            !userSnap.exists
          ) {
            throw new HttpsError(
              "not-found",
              "Withdrawal user not found."
            );
          }

          const userData =
            userSnap.data();

          const pendingWithdrawal =
            Number(
              userData.pendingWithdrawal ??
              0
            );

          const amount =
            Number(
              withdrawal.amount
            );

          if (
            pendingWithdrawal <
            amount
          ) {
            throw new HttpsError(
              "failed-precondition",
              "Pending withdrawal balance is insufficient."
            );
          }

          transaction.update(
            userRef,
            {
              pendingWithdrawal:
                pendingWithdrawal -
                amount,
              updatedAt:
                admin.firestore
                  .FieldValue
                  .serverTimestamp(),
            }
          );

          transaction.update(
            withdrawalRef,
            {
              status:
                "approved",
              approvedBy:
                request.auth.uid,
              approvedAt:
                admin.firestore
                  .FieldValue
                  .serverTimestamp(),
              updatedAt:
                admin.firestore
                  .FieldValue
                  .serverTimestamp(),
            }
          );
        }
      );

      return {
        success: true,
        withdrawalId,
        status:
          "approved",
      };
    }
  );

exports.adminRejectWithdrawal =
  onCall(
    {
      region: "asia-south1",
      invoker: "public",
    },
    async (request) => {
      if (!request.auth) {
        throw new HttpsError(
          "unauthenticated",
          "Admin login required."
        );
      }

      await verifyAdmin(
        request.auth.uid
      );

      const withdrawalId =
        String(
          request.data?.withdrawalId ||
          ""
        ).trim();

      const reason =
        String(
          request.data?.reason ||
          "Withdrawal rejected by admin."
        ).trim();

      if (!withdrawalId) {
        throw new HttpsError(
          "invalid-argument",
          "Withdrawal ID is required."
        );
      }

      const withdrawalRef =
        db
          .collection(
            "withdrawals"
          )
          .doc(withdrawalId);

      await db.runTransaction(
        async (
          transaction
        ) => {
          const withdrawalSnap =
            await transaction.get(
              withdrawalRef
            );

          if (
            !withdrawalSnap.exists
          ) {
            throw new HttpsError(
              "not-found",
              "Withdrawal request not found."
            );
          }

          const withdrawal =
            withdrawalSnap.data();

          if (
            withdrawal.status ===
            "rejected"
          ) {
            return;
          }

          if (
            withdrawal.status !==
            "pending"
          ) {
            throw new HttpsError(
              "failed-precondition",
              "Only pending withdrawals can be rejected."
            );
          }

          const userId =
            withdrawal.userId;

          const amount =
            Number(
              withdrawal.amount
            );

          if (!userId) {
            throw new HttpsError(
              "failed-precondition",
              "Withdrawal user ID is missing."
            );
          }

          const userRef =
            db
              .collection("users")
              .doc(userId);

          const userSnap =
            await transaction.get(
              userRef
            );

          if (
            !userSnap.exists
          ) {
            throw new HttpsError(
              "not-found",
              "Withdrawal user not found."
            );
          }

          const userData =
            userSnap.data();

          const availableBalance =
            Number(
              userData.availableBalance ??
              0
            );

          const pendingWithdrawal =
            Number(
              userData.pendingWithdrawal ??
              0
            );

          transaction.update(
            userRef,
            {
              availableBalance:
                availableBalance +
                amount,
              pendingWithdrawal:
                Math.max(
                  0,
                  pendingWithdrawal -
                    amount
                ),
              updatedAt:
                admin.firestore
                  .FieldValue
                  .serverTimestamp(),
            }
          );

          transaction.update(
            withdrawalRef,
            {
              status:
                "rejected",
              rejectionReason:
                reason,
              rejectedBy:
                request.auth.uid,
              rejectedAt:
                admin.firestore
                  .FieldValue
                  .serverTimestamp(),
              updatedAt:
                admin.firestore
                  .FieldValue
                  .serverTimestamp(),
            }
          );
        }
      );

      return {
        success: true,
        withdrawalId,
        status:
          "rejected",
      };
    }
  );

  /* =========================================================
   USER → ONLINEWALAA WALLET PAYMENT
   ========================================================= */

exports.payOnlineWalaaFromWallet =
  onCall(
    {
      region: "asia-south1",
      invoker: "public",
    },
    async (request) => {

      /* -----------------------------------------------------
         1. LOGIN CHECK
      ----------------------------------------------------- */

      if (!request.auth) {
        throw new HttpsError(
          "unauthenticated",
          "कृपया प्रथम लॉगिन करा."
        );
      }

      const userId =
        request.auth.uid;


      /* -----------------------------------------------------
         2. AMOUNT VALIDATION
      ----------------------------------------------------- */

      const amount =
        Number(
          request.data?.amount
        );

      if (!Number.isFinite(amount)) {
        throw new HttpsError(
          "invalid-argument",
          "कृपया योग्य रक्कम भरा."
        );
      }

      if (amount <= 0) {
        throw new HttpsError(
          "invalid-argument",
          "पेमेंटची रक्कम ₹1 पेक्षा जास्त असावी."
        );
      }

      if (!Number.isInteger(amount)) {
        throw new HttpsError(
          "invalid-argument",
          "रक्कम पूर्ण अंकात असावी."
        );
      }

      /* -----------------------------------------------------
         3. OPTIONAL MAX PAYMENT LIMIT
      ----------------------------------------------------- */

      const MAX_PAYMENT = 50000;

      if (amount > MAX_PAYMENT) {
        throw new HttpsError(
          "invalid-argument",
          `एका पेमेंटची कमाल मर्यादा ₹${MAX_PAYMENT} आहे.`
        );
      }


      /* -----------------------------------------------------
         4. REFERENCES
      ----------------------------------------------------- */

      const userRef =
        db
          .collection("users")
          .doc(userId);

      const adminWalletRef =
        db
          .collection("adminWallet")
          .doc("main");

      const userTransactionRef =
        db
          .collection("walletTransactions")
          .doc();

      const adminTransactionRef =
        db
          .collection("adminWalletTransactions")
          .doc();


      /* -----------------------------------------------------
         5. ATOMIC FIRESTORE TRANSACTION
      ----------------------------------------------------- */

      let result;

      try {

        result =
          await db.runTransaction(
            async (transaction) => {

              /* ---------------------------------------------
                 READ USER
              --------------------------------------------- */

              const userSnap =
                await transaction.get(
                  userRef
                );

              if (!userSnap.exists) {
                throw new HttpsError(
                  "not-found",
                  "User profile सापडला नाही."
                );
              }


              /* ---------------------------------------------
                 READ ADMIN WALLET
              --------------------------------------------- */

              const adminWalletSnap =
                await transaction.get(
                  adminWalletRef
                );


              const userData =
                userSnap.data();


              /* ---------------------------------------------
                 CURRENT USER BALANCE
              --------------------------------------------- */

              const currentWallet =
                Number(
                  userData.walletBalance ??
                  0
                );

              const currentAvailable =
                Number(
                  userData.availableBalance ??
                  0
                );


              /* ---------------------------------------------
                 BALANCE CHECK
              --------------------------------------------- */

              if (
                currentAvailable <
                amount
              ) {

                throw new HttpsError(
                  "failed-precondition",
                  `तुमच्या वॉलेटमध्ये पुरेशी शिल्लक नाही. उपलब्ध शिल्लक ₹${currentAvailable} आहे.`
                );

              }


              /* ---------------------------------------------
                 NEW USER BALANCE
              --------------------------------------------- */

              const newWallet =
                currentWallet -
                amount;

              const newAvailable =
                currentAvailable -
                amount;


              /* ---------------------------------------------
                 ADMIN WALLET BALANCE
              --------------------------------------------- */

              const adminData =
                adminWalletSnap.exists
                  ? adminWalletSnap.data()
                  : {};

              const currentAdminBalance =
                Number(
                  adminData.balance ??
                  0
                );

              const currentAdminTotalReceived =
                Number(
                  adminData.totalReceived ??
                  0
                );


              const newAdminBalance =
                currentAdminBalance +
                amount;

              const newAdminTotalReceived =
                currentAdminTotalReceived +
                amount;


              /* ---------------------------------------------
                 PAYMENT REFERENCE
              --------------------------------------------- */

              const paymentReference =
                `OWP-${Date.now()}-${userId.slice(
                  0,
                  6
                )}`;


              /* ---------------------------------------------
                 UPDATE USER WALLET
              --------------------------------------------- */

              transaction.update(
                userRef,
                {

                  walletBalance:
                    newWallet,

                  availableBalance:
                    newAvailable,

                  updatedAt:
                    admin.firestore
                      .FieldValue
                      .serverTimestamp(),

                }
              );


              /* ---------------------------------------------
                 CREATE / UPDATE ADMIN WALLET
              --------------------------------------------- */

              transaction.set(
                adminWalletRef,
                {

                  balance:
                    newAdminBalance,

                  totalReceived:
                    newAdminTotalReceived,

                  updatedAt:
                    admin.firestore
                      .FieldValue
                      .serverTimestamp(),

                },
                {
                  merge: true
                }
              );


              /* ---------------------------------------------
                 USER TRANSACTION
              --------------------------------------------- */

              transaction.set(
                userTransactionRef,
                {

                  userId:
                    userId,

                  amount:
                    amount,

                  type:
                    "ONLINEWALAA_PAYMENT",

                  direction:
                    "DEBIT",

                  status:
                    "success",

                  referenceId:
                    paymentReference,

                  description:
                    "OnlineWalaa ला पेमेंट",

                  createdAt:
                    admin.firestore
                      .FieldValue
                      .serverTimestamp(),

                }
              );


              /* ---------------------------------------------
                 ADMIN TRANSACTION
              --------------------------------------------- */

              transaction.set(
                adminTransactionRef,
                {

                  userId:
                    userId,

                  amount:
                    amount,

                  type:
                    "ONLINEWALAA_PAYMENT",

                  direction:
                    "CREDIT",

                  status:
                    "success",

                  referenceId:
                    paymentReference,

                  userTransactionId:
                    userTransactionRef.id,

                  description:
                    "User wallet payment received",

                  createdAt:
                    admin.firestore
                      .FieldValue
                      .serverTimestamp(),

                }
              );


              /* ---------------------------------------------
                 RESULT
              --------------------------------------------- */

              return {

                success:
                  true,

                amount:
                  amount,

                referenceId:
                  paymentReference,

                newWallet:
                  newWallet,

                newAvailable:
                  newAvailable,

                adminBalance:
                  newAdminBalance,

              };

            }
          );

      } catch (error) {

        console.error(
          "OnlineWalaa wallet payment error:",
          error
        );


        if (
          error instanceof HttpsError
        ) {
          throw error;
        }


        throw new HttpsError(
          "internal",
          "पेमेंट करताना काहीतरी चूक झाली. कृपया पुन्हा प्रयत्न करा."
        );

      }


      /* -----------------------------------------------------
         SUCCESS RESPONSE
      ----------------------------------------------------- */

      return {

        success:
          true,

        amount:
          result.amount,

        referenceId:
          result.referenceId,

        message:
          `₹${result.amount} चे पेमेंट OnlineWalaa ला यशस्वी झाले.`,

      };

    }
  );

exports.instantPanFind = onCall(
  {
    region: "asia-south1",
    invoker: "public",
    secrets: [PARIPRINT_API_KEY],
  },
  async (request) => {
    console.log("========================================");
    console.log("🚀 instantPanFind START");
    console.log("========================================");

    try {
      // ========================================
      // STEP 1: AUTH CHECK
      // ========================================

      if (!request.auth) {
        console.error("❌ User is not authenticated.");

        throw new HttpsError(
          "unauthenticated",
          "कृपया आधी Login करा."
        );
      }

      const userId = request.auth.uid;

      console.log("Authenticated user:", userId);

      // ========================================
      // STEP 2: GET & VALIDATE AADHAAR
      // ========================================

      const aadhaarNumber = String(
        request.data?.aadhaarNumber || ""
      ).replace(/\D/g, "");

      console.log(
        "Aadhaar received:",
        aadhaarNumber ? "YES" : "NO"
      );

      console.log(
        "Aadhaar length:",
        aadhaarNumber.length
      );

      if (!/^\d{12}$/.test(aadhaarNumber)) {
        console.error("❌ Invalid Aadhaar number.");

        throw new HttpsError(
          "invalid-argument",
          "कृपया 12 अंकों का valid Aadhaar Number दर्ज करें."
        );
      }

      console.log("✅ Aadhaar validation successful.");

      // ========================================
      // STEP 3: SERVICE AMOUNT
      // ========================================

      const SERVICE_AMOUNT = 50;

      console.log(
        `STEP 3: Service amount = ₹${SERVICE_AMOUNT}`
      );

      // ========================================
      // STEP 4: CHECK WALLET BALANCE
      // ========================================

      console.log("STEP 4: Checking wallet balance...");

      const userRef = db.collection("users").doc(userId);

      const userSnap = await userRef.get();

      if (!userSnap.exists) {
        console.error("❌ User document not found.");

        throw new HttpsError(
          "not-found",
          "User account नहीं मिला."
        );
      }

      const userData = userSnap.data() || {};

      const currentWalletBalance = Number(
        userData.walletBalance || 0
      );

      const currentAvailableBalance = Number(
        userData.availableBalance ??
        userData.walletBalance ??
        0
      );

      console.log(
        "Wallet balance:",
        currentWalletBalance
      );

      console.log(
        "Available balance:",
        currentAvailableBalance
      );

      if (currentAvailableBalance < SERVICE_AMOUNT) {
        console.error("❌ Insufficient wallet balance.");

        throw new HttpsError(
          "failed-precondition",
          `Wallet balance insufficient. कम से कम ₹${SERVICE_AMOUNT} होना चाहिए.`
        );
      }

      console.log("✅ Wallet balance sufficient.");

      // ========================================
      // STEP 5: CHECK PARIPRINT API CONFIG
      // ========================================

      console.log(
        "STEP 5: Checking Pariprint API configuration..."
      );

      const apiKey = PARIPRINT_API_KEY.value();

      if (!apiKey) {
        console.error(
          "❌ Pariprint API key is not configured."
        );

        throw new HttpsError(
          "failed-precondition",
          "Pariprint API configuration missing है."
        );
      }

      console.log(
        "✅ Pariprint API key is configured."
      );

      // ========================================
      // STEP 6: PREPARE PARIPRINT REQUEST
      // ========================================

      console.log(
        "STEP 6: Preparing Pariprint API request..."
      );

      const endpoint =
        "https://pariprint.in/api-proxy.php";

      const slug = "instant-pan-find";

      const apiUrl = new URL(endpoint);

      apiUrl.searchParams.set("slug", slug);
      apiUrl.searchParams.set(
        "api_key",
        apiKey
      );
      apiUrl.searchParams.set(
        "aadhaar_number",
        aadhaarNumber
      );

      console.log(
        "Pariprint endpoint:",
        endpoint
      );

      console.log(
        "Pariprint slug:",
        slug
      );

      // ========================================
      // STEP 7: CALL PARIPRINT API
      // ========================================

      console.log(
        "STEP 7: Calling Pariprint API..."
      );

      let providerResponse;

      try {
        providerResponse = await fetch(
          apiUrl.toString(),
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
          }
        );
      } catch (fetchError) {
        console.error(
          "❌ Pariprint API request failed:",
          fetchError
        );

        throw new HttpsError(
          "unavailable",
          "PAN service temporarily unavailable है. कृपया थोड़ी देर बाद try करें."
        );
      }

      console.log(
        "✅ Pariprint API request completed."
      );

      console.log(
        "Pariprint HTTP status:",
        providerResponse.status
      );

      console.log(
        "Pariprint HTTP status text:",
        providerResponse.statusText
      );

      // ========================================
      // STEP 8: READ PARIPRINT RESPONSE
      // ========================================

      console.log(
        "STEP 8: Reading Pariprint response..."
      );

      let apiData;

      try {
        apiData = await providerResponse.json();
      } catch (jsonError) {
        console.error(
          "❌ Unable to parse Pariprint JSON response:",
          jsonError
        );

        throw new HttpsError(
          "internal",
          "PAN service से invalid response मिला."
        );
      }

      console.log(
        "📦 PARIPRINT RESPONSE RECEIVED"
      );

      console.log(
        "API status:",
        apiData?.status
      );

      console.log(
        "API message:",
        apiData?.message
      );

      console.log(
        "Response code:",
        apiData?.response_code
      );

      console.log(
        "PAN field:",
        apiData?.full_pan_number
          ? "full_pan_number received"
          : apiData?.pan_number
          ? "pan_number received"
          : "PAN not received"
      );

      // ========================================
      // STEP 9: CHECK PARIPRINT RESPONSE
      // ========================================

      console.log(
        "STEP 9: Checking Pariprint response..."
      );

      const providerStatus =
        apiData?.status === true ||
        String(apiData?.status)
          .trim()
          .toLowerCase() === "true";

      /*
       * IMPORTANT:
       * Pariprint response currently returns:
       *
       * full_pan_number: "FGAPK8630M"
       *
       * instead of:
       *
       * pan_number: "FGAPK8630M"
       *
       * Therefore we support both fields.
       */

      const panNumber = String(
        apiData?.full_pan_number ||
        apiData?.pan_number ||
        ""
      )
        .trim()
        .toUpperCase();

      const validPanFormat =
        /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(
          panNumber
        );

      const panFindCompleted =
        String(
          apiData?.aadhaar_to_panfind_status || ""
        )
          .trim()
          .toUpperCase() === "COMPLETED";

      console.log(
        "Provider status accepted:",
        providerStatus
      );

      console.log(
        "PAN extracted:",
        panNumber ? "YES" : "NO"
      );

      console.log(
        "PAN format valid:",
        validPanFormat
      );

      console.log(
        "PAN find completed:",
        panFindCompleted
      );

      /*
       * Successful response requires:
       *
       * 1. Provider status = true
       * 2. Valid PAN format
       * 3. PAN find status = COMPLETED
       */

      const apiSuccess =
        providerStatus &&
        validPanFormat &&
        panFindCompleted;

      console.log(
        "Final API success:",
        apiSuccess
      );

      // ========================================
      // PROVIDER FAILURE
      // ========================================

      if (!apiSuccess) {
        console.error(
          "❌ PAN FIND FAILED."
        );

        console.error(
          "Provider message:",
          apiData?.message
        );

        console.error(
          "Provider status:",
          apiData?.status
        );

        console.error(
          "PAN received:",
          panNumber ? "YES" : "NO"
        );

        console.error(
          "PAN status:",
          apiData?.aadhaar_to_panfind_status
        );

        throw new HttpsError(
          "failed-precondition",
          apiData?.message ||
            "PAN Number सापडला नाही."
        );
      }

      console.log(
        "🎉 PAN FIND SUCCESSFUL"
      );

      // ========================================
      // STEP 10: WALLET DEBIT
      // ========================================

      console.log(
        "STEP 10: Starting wallet debit..."
      );

      const walletTransactionRef =
        db.collection("walletTransactions").doc();

      const panRequestRef =
        db.collection("panFindRequests").doc();

      const transactionResult =
        await db.runTransaction(
          async (transaction) => {
            const freshUserSnap =
              await transaction.get(userRef);

            if (!freshUserSnap.exists) {
              throw new HttpsError(
                "not-found",
                "User account नहीं मिला."
              );
            }

            const freshUserData =
              freshUserSnap.data() || {};

            const freshWalletBalance =
              Number(
                freshUserData.walletBalance || 0
              );

            const freshAvailableBalance =
              Number(
                freshUserData.availableBalance ??
                freshUserData.walletBalance ??
                0
              );

            console.log(
              "Fresh wallet balance:",
              freshWalletBalance
            );

            console.log(
              "Fresh available balance:",
              freshAvailableBalance
            );

            if (
              freshAvailableBalance <
              SERVICE_AMOUNT
            ) {
              throw new HttpsError(
                "failed-precondition",
                `Wallet balance insufficient. कम से कम ₹${SERVICE_AMOUNT} होना चाहिए.`
              );
            }

            const newWalletBalance =
              Math.max(
                0,
                freshWalletBalance -
                  SERVICE_AMOUNT
              );

            const newAvailableBalance =
              Math.max(
                0,
                freshAvailableBalance -
                  SERVICE_AMOUNT
              );

            // --------------------------------
            // UPDATE USER WALLET
            // --------------------------------

            transaction.update(
              userRef,
              {
                walletBalance:
                  newWalletBalance,

                availableBalance:
                  newAvailableBalance,

                updatedAt:
                  admin.firestore.FieldValue
                    .serverTimestamp(),
              }
            );

            // --------------------------------
            // WALLET TRANSACTION
            // --------------------------------

            transaction.set(
              walletTransactionRef,
              {
                userId: userId,

                amount:
                  SERVICE_AMOUNT,

                type:
                  "SERVICE_PAYMENT",

                direction:
                  "DEBIT",

                status:
                  "success",

                service:
                  "INSTANT_PAN_FIND",

                description:
                  "Instant PAN Find",

                provider:
                  "pariprint",

                referenceId:
                  panRequestRef.id,

                createdAt:
                  admin.firestore.FieldValue
                    .serverTimestamp(),
              }
            );

            // --------------------------------
            // PAN FIND REQUEST
            // --------------------------------

            transaction.set(
              panRequestRef,
              {
                userId: userId,

                service:
                  "INSTANT_PAN_FIND",

                status:
                  "success",

                amount:
                  SERVICE_AMOUNT,

                panNumber:
                  panNumber,

                provider:
                  "pariprint",

                walletTransactionId:
                  walletTransactionRef.id,

                requestId:
                  apiData?.request_id || null,

                orderId:
                  apiData?.order_id || null,

                aadhaarStatus:
                  apiData?.aadhaar_status || null,

                providerStatus:
                  apiData?.aadhaar_to_panfind_status ||
                  null,

                createdAt:
                  admin.firestore.FieldValue
                    .serverTimestamp(),
              }
            );

            return {
              newWalletBalance,
              newAvailableBalance,
            };
          }
        );

      console.log(
        "✅ Wallet debit successful."
      );

      console.log(
        `Debited ₹${SERVICE_AMOUNT}`
      );

      console.log(
        "Remaining wallet balance:",
        transactionResult.newWalletBalance
      );

      // ========================================
      // STEP 11: SUCCESS RESPONSE
      // ========================================

      console.log(
        "STEP 11: Returning successful response..."
      );

      console.log(
        "Transaction ID:",
        walletTransactionRef.id
      );

      console.log(
        "PAN Find Request ID:",
        panRequestRef.id
      );

      console.log(
        "========================================"
      );

      console.log(
        "🎉 instantPanFind SUCCESS"
      );

      console.log(
        "========================================"
      );

      return {
        success: true,

        message:
          apiData?.message ||
          "Aadhaar to PAN find successful.",

        panNumber:
          panNumber,

        amount:
          SERVICE_AMOUNT,

        transactionId:
          walletTransactionRef.id,

        requestId:
          panRequestRef.id,

        providerRequestId:
          apiData?.request_id || null,

        remainingBalance:
          transactionResult.newWalletBalance,
      };

    } catch (error) {

      // ========================================
      // ERROR HANDLING
      // ========================================

      console.error(
        "========================================"
      );

      console.error(
        "❌ instantPanFind ERROR"
      );

      console.error(
        "Error code:",
        error?.code
      );

      console.error(
        "Error message:",
        error?.message
      );

      console.error(
        "Error details:",
        error?.details
      );

      console.error(
        "========================================"
      );

      // Preserve Firebase HttpsError
      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        "Instant PAN Find service मध्ये unexpected error आला."
      );
    }
  }
);

exports.instantRcPdf = onCall(
  {
    region: "asia-south1",
    secrets: [PARIPRINT_API_KEY],
    timeoutSeconds: 120,
    memory: "256MiB",
  },
  async (request) => {
    // ============================================================
    // 1. AUTH CHECK
    // ============================================================
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "कृपया आधी लॉगिन करा."
      );
    }

    const userId = request.auth.uid;

    // ============================================================
    // 2. INPUT
    // ============================================================
    let rcNumber = String(
      request.data?.rcNumber || ""
    )
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "");

    if (!rcNumber) {
      throw new HttpsError(
        "invalid-argument",
        "कृपया RC नंबर टाका."
      );
    }

    // Basic RC number validation
    if (!/^[A-Z0-9-]+$/.test(rcNumber)) {
      throw new HttpsError(
        "invalid-argument",
        "कृपया योग्य RC नंबर टाका."
      );
    }

    // ============================================================
    // 3. SERVICE CHARGE
    // ============================================================
    const SERVICE_CHARGE = 40;

    // ============================================================
    // 4. USER WALLET CHECK
    // ============================================================
    const userRef = db.collection("users").doc(userId);

    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      throw new HttpsError(
        "not-found",
        "यूजर खाते सापडले नाही."
      );
    }

    const userData = userSnap.data() || {};

    const currentBalance = Number(
      userData.walletBalance || 0
    );

    if (!Number.isFinite(currentBalance)) {
      throw new HttpsError(
        "failed-precondition",
        "Wallet balance उपलब्ध नाही."
      );
    }

    if (currentBalance < SERVICE_CHARGE) {
      throw new HttpsError(
        "failed-precondition",
        `तुमच्या Wallet मध्ये पुरेशी रक्कम नाही. ₹${SERVICE_CHARGE} आवश्यक आहेत.`
      );
    }

    // ============================================================
    // 5. PARIPRINT API
    // ============================================================
    const apiKey = PARIPRINT_API_KEY.value();

    if (!apiKey) {
      console.error("PARIPRINT_API_KEY is missing.");

      throw new HttpsError(
        "internal",
        "Service configuration error."
      );
    }

    const apiUrl =
      "https://pariprint.in/api-proxy.php" +
      "?slug=instant-rc-pdf" +
      "&api_key=" +
      encodeURIComponent(apiKey) +
      "&rcno=" +
      encodeURIComponent(rcNumber);

    console.log("==========================================");
    console.log("INSTANT RC PDF REQUEST");
    console.log("User:", userId);
    console.log("RC Number:", rcNumber);
    console.log("==========================================");

    // ============================================================
    // 6. PROVIDER REQUEST WITH RETRIES
    // ============================================================
    let providerResponse = null;
    let responseText = "";
    let lastError = null;

    const MAX_ATTEMPTS = 3;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        console.log(
          `Calling Pariprint API - Attempt ${attempt}/${MAX_ATTEMPTS}`
        );

        providerResponse = await fetch(apiUrl, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "User-Agent": "OnlineWalaa/1.0",
          },
        });

        responseText = await providerResponse.text();

        console.log("========== PARIPRINT DEBUG ==========");
        console.log("HTTP STATUS:", providerResponse.status);
        console.log("RAW RESPONSE:", responseText);
        console.log("======================================");

        // Retry temporary provider/server errors
        if (
          [502, 503, 504].includes(providerResponse.status) &&
          attempt < MAX_ATTEMPTS
        ) {
          console.log(
            `Temporary provider error ${providerResponse.status}. Retrying...`
          );

          await new Promise((resolve) =>
            setTimeout(resolve, 1500 * attempt)
          );

          continue;
        }

        break;
      } catch (error) {
        lastError = error;

        console.error(
          `Pariprint request failed on attempt ${attempt}:`,
          error
        );

        if (attempt < MAX_ATTEMPTS) {
          await new Promise((resolve) =>
            setTimeout(resolve, 1500 * attempt)
          );
        }
      }
    }

    if (!providerResponse) {
      console.error(
        "Pariprint provider unavailable:",
        lastError
      );

      throw new HttpsError(
        "unavailable",
        "RC PDF सेवा सध्या उपलब्ध नाही. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा."
      );
    }

    // ============================================================
    // 7. PARSE PROVIDER RESPONSE
    // ============================================================
    let apiData = null;

    try {
      apiData = JSON.parse(responseText);
    } catch (error) {
      console.error("JSON PARSE ERROR:", error);
      console.error("RAW RESPONSE:", responseText);

      throw new HttpsError(
        "failed-precondition",
        "RC PDF service कडून योग्य response मिळाला नाही."
      );
    }

    console.log("========== PARSED RESPONSE ==========");
    console.log(JSON.stringify(apiData, null, 2));
    console.log("=====================================");

    // ============================================================
    // 8. EXTRACT PDF LINK
    // ============================================================
    const pdfLink = String(
      apiData?.pdf_link ||
      apiData?.pdfLink ||
      apiData?.download_url ||
      ""
    ).trim();

    console.log("FINAL PDF LINK:", pdfLink);

    // ============================================================
    // 9. IMPORTANT:
    //    PDF LINK EXISTS = SUCCESS
    //
    //    We don't depend only on HTTP status or `status`
    //    because provider may return a valid PDF link with
    //    a non-200 response.
    // ============================================================
    if (!pdfLink) {
      console.error(
        "RC PDF NOT FOUND - Provider returned no PDF link."
      );

      throw new HttpsError(
        "failed-precondition",
        apiData?.message ||
          "RC PDF not found or unavailable."
      );
    }

    // ============================================================
    // 10. PDF URL VALIDATION
    // ============================================================
    let parsedPdfUrl;

    try {
      parsedPdfUrl = new URL(pdfLink);
    } catch (error) {
      console.error("Invalid PDF URL:", pdfLink);

      throw new HttpsError(
        "failed-precondition",
        "RC PDF ची download link योग्य नाही."
      );
    }

    if (
      parsedPdfUrl.protocol !== "http:" &&
      parsedPdfUrl.protocol !== "https:"
    ) {
      throw new HttpsError(
        "failed-precondition",
        "RC PDF ची download link सुरक्षित नाही."
      );
    }

    // ============================================================
    // 11. PROVIDER SUCCESS
    // ============================================================
    const requestId =
      apiData?.request_id ||
      apiData?.order_id ||
      null;

    const providerMessage =
      apiData?.message ||
      "RC PDF fetched successfully.";

    // ============================================================
    // 12. ATOMIC WALLET DEBIT
    // ============================================================
    const transactionId = db
      .collection("walletTransactions")
      .doc().id;

    const rcRequestId = db
      .collection("rcPdfRequests")
      .doc().id;

    let remainingBalance = 0;

    await db.runTransaction(async (transaction) => {
      const freshUserSnap = await transaction.get(userRef);

      if (!freshUserSnap.exists) {
        throw new HttpsError(
          "not-found",
          "यूजर खाते सापडले नाही."
        );
      }

      const freshUserData = freshUserSnap.data() || {};

      const walletBalance = Number(
        freshUserData.walletBalance || 0
      );

      if (
        !Number.isFinite(walletBalance) ||
        walletBalance < SERVICE_CHARGE
      ) {
        throw new HttpsError(
          "failed-precondition",
          `Wallet मध्ये ₹${SERVICE_CHARGE} पेक्षा कमी balance आहे.`
        );
      }

      remainingBalance =
        Math.round(
          (walletBalance - SERVICE_CHARGE) * 100
        ) / 100;

      // ------------------------------------------
      // Deduct wallet
      // ------------------------------------------
      transaction.update(userRef, {
        walletBalance: remainingBalance,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // ------------------------------------------
      // Wallet transaction record
      // ------------------------------------------
      const walletTransactionRef = db
        .collection("walletTransactions")
        .doc(transactionId);

      transaction.set(walletTransactionRef, {
        userId,
        type: "debit",
        amount: SERVICE_CHARGE,

        service: "INSTANT_RC_PDF",
        serviceName: "Instant RC PDF",

        rcNumber,

        requestId,
        provider: "PARIPRINT",

        description: `Instant RC PDF - ${rcNumber}`,

        balanceBefore: walletBalance,
        balanceAfter: remainingBalance,

        status: "SUCCESS",

        createdAt:
          admin.firestore.FieldValue.serverTimestamp(),
      });

      // ------------------------------------------
      // RC request record
      // ------------------------------------------
      const rcRequestRef = db
        .collection("rcPdfRequests")
        .doc(rcRequestId);

      transaction.set(rcRequestRef, {
        userId,

        rcNumber,

        amount: SERVICE_CHARGE,

        pdfLink,

        requestId,

        orderId:
          apiData?.order_id || null,

        providerMessage,

        providerStatus:
          apiData?.status ?? null,

        responseCode:
          apiData?.response_code ??
          providerResponse.status,

        status: "SUCCESS",

        transactionId,

        createdAt:
          admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    // ============================================================
    // 13. SUCCESS RESPONSE TO FRONTEND
    // ============================================================
    console.log("==========================================");
    console.log("INSTANT RC PDF SUCCESS");
    console.log("RC:", rcNumber);
    console.log("PDF:", pdfLink);
    console.log("Transaction:", transactionId);
    console.log("Remaining Balance:", remainingBalance);
    console.log("==========================================");

    return {
      success: true,

      message: providerMessage,

      rcNumber,

      pdfLink,

      amount: SERVICE_CHARGE,

      transactionId,

      requestId,

      remainingBalance,
    };
  }
);

exports.instantLlPdf = onCall(
  {
    region: "asia-south1",
    secrets: [PARIPRINT_API_KEY],
    timeoutSeconds: 60,
    memory: "256MiB",
  },

  async (request) => {
    const uid = request.auth?.uid;

    if (!uid) {
      throw new HttpsError(
        "unauthenticated",
        "कृपया प्रथम लॉगिन करा."
      );
    }

    const applicationNumber = String(
      request.data?.application_no ||
      request.data?.applicationNumber ||
      ""
    )
      .trim()
      .toUpperCase();

    if (!applicationNumber) {
      throw new HttpsError(
        "invalid-argument",
        "Learning Licence Application Number टाका."
      );
    }

    /*
     * Application number basic validation.
     *
     * PariPrint may have different application number formats,
     * therefore we don't make this overly restrictive.
     */
    if (!/^[A-Z0-9-]{5,30}$/.test(applicationNumber)) {
      throw new HttpsError(
        "invalid-argument",
        "कृपया योग्य Application Number टाका."
      );
    }

    /*
     * -------------------------------------------------------
     * WALLET
     * -------------------------------------------------------
     *
     * IMPORTANT:
     * खाली LL साठी OnlineWalaa service charge set करा.
     *
     * Example:
     * Provider fee = ₹3
     * OnlineWalaa charge = ₹10
     *
     * जर तुमचा charge वेगळा असेल तर फक्त ही value बदला.
     */

    const SERVICE_CHARGE = 50;

    const userRef = db.collection("users").doc(uid);

    // -------------------------------------------------------
    // Check wallet balance
    // -------------------------------------------------------

    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      throw new HttpsError(
        "not-found",
        "User account सापडले नाही."
      );
    }

    const userData = userSnap.data() || {};

    const currentBalance = Number(
      userData.walletBalance ??
      userData.balance ??
      0
    );

    if (!Number.isFinite(currentBalance)) {
      throw new HttpsError(
        "failed-precondition",
        "Wallet balance invalid आहे."
      );
    }

    if (currentBalance < SERVICE_CHARGE) {
      throw new HttpsError(
        "failed-precondition",
        `तुमच्या wallet मध्ये पुरेशी रक्कम नाही. आवश्यक रक्कम ₹${SERVICE_CHARGE} आहे.`
      );
    }

    // -------------------------------------------------------
    // Call PariPrint API
    // -------------------------------------------------------

    const apiKey = PARIPRINT_API_KEY.value();

    if (!apiKey) {
      console.error("PARIPRINT_API_KEY is missing.");

      throw new HttpsError(
        "failed-precondition",
        "Service configuration उपलब्ध नाही."
      );
    }

    const apiUrl =
      "https://pariprint.in/api-proxy.php" +
      "?slug=instant-ll-pdf" +
      "&application_no=" +
      encodeURIComponent(applicationNumber) +
      "&api_key=" +
      encodeURIComponent(apiKey);

    console.log("========================================");
    console.log("INSTANT LL PDF REQUEST");
    console.log("User:", uid);
    console.log("Application Number:", applicationNumber);
    console.log("Calling PariPrint API...");
    console.log("========================================");

    let apiResponse;

    try {
      apiResponse = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });
    } catch (error) {
      console.error("PariPrint connection error:", error);

      throw new HttpsError(
        "unavailable",
        "LL PDF service शी संपर्क होऊ शकला नाही. कृपया पुन्हा प्रयत्न करा."
      );
    }

    const rawText = await apiResponse.text();

    console.log("PariPrint HTTP STATUS:", apiResponse.status);

    let apiData;

    try {
      apiData = JSON.parse(rawText);
    } catch (error) {
      console.error("Invalid PariPrint JSON response:", rawText);

      throw new HttpsError(
        "internal",
        "LL service कडून invalid response मिळाला."
      );
    }

    console.log(
      "PariPrint RESPONSE:",
      JSON.stringify({
        status: apiData?.status,
        message: apiData?.message,
        fee: apiData?.fee,
        order_id: apiData?.order_id,
        application_number: apiData?.application_number,
        hasPdf: Boolean(apiData?.data?.pdf || apiData?.pdf),
      })
    );

    // -------------------------------------------------------
    // Check provider success
    // -------------------------------------------------------

    const providerSuccess =
      apiData?.status === "success" ||
      apiData?.status === true ||
      apiData?.status === "SUCCESS";

    const pdfBase64 = String(
      apiData?.data?.pdf ||
      apiData?.pdf ||
      ""
    ).trim();

    /*
     * PDF is the actual success criterion.
     *
     * PariPrint response:
     *
     * {
     *   status: "success",
     *   data: {
     *      pdf: "JVBERi0xLjQK..."
     *   }
     * }
     */

    if (!providerSuccess || !pdfBase64) {
      console.log(
        "LL PDF NOT AVAILABLE:",
        apiData?.message || "No PDF returned"
      );

      throw new HttpsError(
        "not-found",
        apiData?.message ||
          "Learning Licence PDF उपलब्ध नाही."
      );
    }

    // -------------------------------------------------------
    // Basic Base64 validation
    // -------------------------------------------------------

    if (pdfBase64.length < 100) {
      console.error("Invalid/too-small PDF Base64 response.");

      throw new HttpsError(
        "internal",
        "Provider कडून valid PDF मिळाली नाही."
      );
    }

    /*
     * Most PDF Base64 strings start with:
     *
     * JVBERi0
     *
     * because PDF starts with %PDF.
     */

    if (!pdfBase64.startsWith("JVBERi")) {
      console.warn(
        "PDF Base64 does not start with expected PDF signature."
      );
    }

    // -------------------------------------------------------
    // Generate transaction ID
    // -------------------------------------------------------

    const transactionRef =
      db.collection("walletTransactions").doc();

    const llRequestRef =
      db.collection("llPdfRequests").doc();

    const transactionId = transactionRef.id;
    const requestId = llRequestRef.id;

    // -------------------------------------------------------
    // ATOMIC WALLET DEBIT
    // -------------------------------------------------------

    let remainingBalance = 0;

    try {
      await db.runTransaction(async (transaction) => {
        const freshUserSnap = await transaction.get(userRef);

        if (!freshUserSnap.exists) {
          throw new Error("USER_NOT_FOUND");
        }

        const freshUserData = freshUserSnap.data() || {};

        const balance = Number(
          freshUserData.walletBalance ??
          freshUserData.balance ??
          0
        );

        if (!Number.isFinite(balance)) {
          throw new Error("INVALID_BALANCE");
        }

        if (balance < SERVICE_CHARGE) {
          throw new Error("INSUFFICIENT_BALANCE");
        }

        remainingBalance = Number(
          (balance - SERVICE_CHARGE).toFixed(2)
        );

        /*
         * Keep walletBalance as your main wallet field.
         *
         * If your existing wallet uses another field,
         * adapt this section to your existing wallet structure.
         */

        transaction.update(userRef, {
          walletBalance: remainingBalance,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Wallet transaction record

        transaction.set(transactionRef, {
          userId: uid,
          type: "debit",
          service: "INSTANT_LL_PDF",
          serviceName: "Instant LL PDF",
          amount: SERVICE_CHARGE,
          description:"Instant LL PDF",
          applicationNumber: applicationNumber,

          provider: "pariprint",

          providerFee: Number(apiData?.fee || 0),

          providerOrderId:
            apiData?.order_id ||
            null,

          status: "SUCCESS",

          balanceBefore: balance,
          balanceAfter: remainingBalance,

          requestId,

          createdAt:
            admin.firestore.FieldValue.serverTimestamp(),
        });

        // LL request record

        transaction.set(llRequestRef, {
          userId: uid,

          applicationNumber,

          service: "INSTANT_LL_PDF",

          amount: SERVICE_CHARGE,

          providerFee: Number(apiData?.fee || 0),

          providerOrderId:
            apiData?.order_id ||
            null,

          providerMessage:
            apiData?.message ||
            "Learning Licence PDF fetched successfully.",

          status: "SUCCESS",

          transactionId,

          createdAt:
            admin.firestore.FieldValue.serverTimestamp(),
        });
      });
    } catch (error) {
      console.error("Wallet transaction error:", error);

      if (error.message === "INSUFFICIENT_BALANCE") {
        throw new HttpsError(
          "failed-precondition",
          "तुमच्या wallet मध्ये पुरेशी रक्कम नाही."
        );
      }

      if (error.message === "USER_NOT_FOUND") {
        throw new HttpsError(
          "not-found",
          "User account सापडले नाही."
        );
      }

      throw new HttpsError(
        "internal",
        "Wallet debit करण्यात समस्या आली."
      );
    }

    // -------------------------------------------------------
    // SUCCESS
    // -------------------------------------------------------

    console.log("========================================");
    console.log("LL PDF SUCCESS");
    console.log("Application:", applicationNumber);
    console.log("Transaction:", transactionId);
    console.log("Amount:", SERVICE_CHARGE);
    console.log("Remaining Balance:", remainingBalance);
    console.log("========================================");

    return {
      success: true,

      message:
        apiData?.message ||
        "Learning Licence PDF successfully fetched.",

      applicationNumber,

      pdf: pdfBase64,

      amount: SERVICE_CHARGE,

      transactionId,

      requestId,

      providerOrderId:
        apiData?.order_id ||
        null,

      remainingBalance,
    };
  }
);

exports.instantDlPdf = onCall(
  {
    region: "asia-south1",
    secrets: [PARIPRINT_API_KEY],
    timeoutSeconds: 60,
    memory: "256MiB",
  },
  async (request) => {
    const uid = request.auth?.uid;

    if (!uid) {
      throw new HttpsError(
        "unauthenticated",
        "कृपया प्रथम लॉगिन करा."
      );
    }

    const dlNumber = String(
      request.data?.dl ||
      request.data?.dlNumber ||
      ""
    )
      .trim()
      .toUpperCase();

    const dob = String(
      request.data?.dob || ""
    ).trim();

    // =====================================================
    // VALIDATION
    // =====================================================

    if (!dlNumber) {
      throw new HttpsError(
        "invalid-argument",
        "Driving Licence Number टाका."
      );
    }

    if (!/^[A-Z0-9-]{5,30}$/.test(dlNumber)) {
      throw new HttpsError(
        "invalid-argument",
        "कृपया योग्य Driving Licence Number टाका."
      );
    }

    if (!dob) {
      throw new HttpsError(
        "invalid-argument",
        "कृपया Date of Birth टाका."
      );
    }

    // Expected format: DD-MM-YYYY
    const dobRegex =
      /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-\d{4}$/;

    if (!dobRegex.test(dob)) {
      throw new HttpsError(
        "invalid-argument",
        "Date of Birth DD-MM-YYYY format मध्ये टाका."
      );
    }

    // =====================================================
    // ONLINEWALAA CHARGE
    // =====================================================

    const SERVICE_CHARGE = 50;

    const userRef =
      db.collection("users").doc(uid);

    // =====================================================
    // CHECK USER / WALLET
    // =====================================================

    const userSnap =
      await userRef.get();

    if (!userSnap.exists) {
      throw new HttpsError(
        "not-found",
        "User account सापडले नाही."
      );
    }

    const userData =
      userSnap.data() || {};

    const currentBalance = Number(
      userData.walletBalance ??
      userData.balance ??
      0
    );

    if (
      !Number.isFinite(currentBalance)
    ) {
      throw new HttpsError(
        "failed-precondition",
        "Wallet balance invalid आहे."
      );
    }

    if (
      currentBalance < SERVICE_CHARGE
    ) {
      throw new HttpsError(
        "failed-precondition",
        `तुमच्या wallet मध्ये पुरेशी रक्कम नाही. आवश्यक रक्कम ₹${SERVICE_CHARGE} आहे.`
      );
    }

    // =====================================================
    // PARIPRINT API
    // =====================================================

    const apiKey =
      PARIPRINT_API_KEY.value();

    if (!apiKey) {
      console.error(
        "PARIPRINT_API_KEY is missing."
      );

      throw new HttpsError(
        "failed-precondition",
        "Service configuration उपलब्ध नाही."
      );
    }

    const apiUrl =
      "https://pariprint.in/api-proxy.php" +
      "?slug=instant-dl-pdf" +
      "&dl=" +
      encodeURIComponent(dlNumber) +
      "&dob=" +
      encodeURIComponent(dob) +
      "&api_key=" +
      encodeURIComponent(apiKey);

    console.log(
      "========================================"
    );

    console.log(
      "INSTANT DL PDF REQUEST"
    );

    console.log(
      "User:",
      uid
    );

    console.log(
      "DL Number:",
      dlNumber
    );

    console.log(
      "DOB:",
      dob
    );

    let apiResponse;

    try {
      apiResponse =
        await fetch(apiUrl, {
          method: "GET",
          headers: {
            Accept:
              "application/json",
          },
        });
    } catch (error) {
      console.error(
        "PariPrint connection error:",
        error
      );

      throw new HttpsError(
        "unavailable",
        "DL PDF service शी संपर्क होऊ शकला नाही. कृपया पुन्हा प्रयत्न करा."
      );
    }

    const rawText =
      await apiResponse.text();

    console.log(
      "HTTP STATUS:",
      apiResponse.status
    );

    let apiData;

    try {
      apiData =
        JSON.parse(rawText);
    } catch (error) {
      console.error(
        "Invalid PariPrint response:",
        rawText
      );

      throw new HttpsError(
        "internal",
        "DL service कडून invalid response मिळाला."
      );
    }

    // =====================================================
    // EXTRACT PDF
    // =====================================================

    const pdfBase64 =
      String(
        apiData?.data?.a4_base64 ||
        apiData?.a4_base64 ||
        apiData?.data?.pdf ||
        apiData?.pdf ||
        ""
      ).trim();

    const providerSuccess =
      apiData?.status === "SUCCESS" ||
      apiData?.status === "success" ||
      apiData?.status === true;

    console.log(
      "Provider Status:",
      apiData?.status
    );

    console.log(
      "Provider Message:",
      apiData?.message
    );

    console.log(
      "DL Number:",
      apiData?.data?.dl_number
    );

    console.log(
      "Has PDF:",
      Boolean(pdfBase64)
    );

    // =====================================================
    // SUCCESS ONLY IF PDF EXISTS
    // =====================================================

    if (
      !providerSuccess ||
      !pdfBase64
    ) {
      console.log(
        "DL PDF NOT AVAILABLE"
      );

      throw new HttpsError(
        "not-found",
        apiData?.message ||
          "Driving Licence PDF उपलब्ध नाही."
      );
    }

    if (
      pdfBase64.length < 100
    ) {
      throw new HttpsError(
        "internal",
        "Provider कडून valid PDF मिळाली नाही."
      );
    }

    // =====================================================
    // REMOVE DATA URL PREFIX IF PRESENT
    // =====================================================

    const cleanPdfBase64 =
      pdfBase64.replace(
        /^data:application\/pdf;base64,/i,
        ""
      );

    // =====================================================
    // TRANSACTION REFERENCES
    // =====================================================

    const transactionRef =
      db
        .collection("walletTransactions")
        .doc();

    const dlRequestRef =
      db
        .collection("dlPdfRequests")
        .doc();

    const transactionId =
      transactionRef.id;

    const requestId =
      dlRequestRef.id;

    let remainingBalance = 0;

    // =====================================================
    // ATOMIC WALLET DEBIT
    // =====================================================

    try {
      await db.runTransaction(
        async (transaction) => {
          const freshUserSnap =
            await transaction.get(
              userRef
            );

          if (
            !freshUserSnap.exists
          ) {
            throw new Error(
              "USER_NOT_FOUND"
            );
          }

          const freshUserData =
            freshUserSnap.data() || {};

          const balance =
            Number(
              freshUserData.walletBalance ??
              freshUserData.balance ??
              0
            );

          if (
            !Number.isFinite(balance)
          ) {
            throw new Error(
              "INVALID_BALANCE"
            );
          }

          if (
            balance <
            SERVICE_CHARGE
          ) {
            throw new Error(
              "INSUFFICIENT_BALANCE"
            );
          }

          remainingBalance =
            Number(
              (
                balance -
                SERVICE_CHARGE
              ).toFixed(2)
            );

          // Wallet update

          transaction.update(
            userRef,
            {
              walletBalance:
                remainingBalance,

              updatedAt:
                admin.firestore
                  .FieldValue
                  .serverTimestamp(),
            }
          );

          // Wallet transaction

          transaction.set(
            transactionRef,
            {
              userId: uid,

              type: "debit",

              service:
                "INSTANT_DL_PDF",

              serviceName:
                "Instant DL PDF",
               description:"Instant DL PDF",
              amount:
                SERVICE_CHARGE,

              dlNumber,

              dob,

              provider:
                "pariprint",

              providerFee:
                Number(
                  apiData?.fee || 0
                ),

              providerOrderId:
                apiData?.order_id ||
                null,

              status:
                "SUCCESS",

              balanceBefore:
                balance,

              balanceAfter:
                remainingBalance,

              requestId,

              createdAt:
                admin.firestore
                  .FieldValue
                  .serverTimestamp(),
            }
          );

          // DL request record

          transaction.set(
            dlRequestRef,
            {
              userId: uid,

              dlNumber,

              dob,

              service:
                "INSTANT_DL_PDF",

              amount:
                SERVICE_CHARGE,

              providerFee:
                Number(
                  apiData?.fee || 0
                ),

              providerOrderId:
                apiData?.order_id ||
                null,

              providerMessage:
                apiData?.message ||
                "DL card generated successfully.",

              status:
                "SUCCESS",

              transactionId,

              createdAt:
                admin.firestore
                  .FieldValue
                  .serverTimestamp(),
            }
          );
        }
      );
    } catch (error) {
      console.error(
        "Wallet transaction error:",
        error
      );

      if (
        error.message ===
        "INSUFFICIENT_BALANCE"
      ) {
        throw new HttpsError(
          "failed-precondition",
          "तुमच्या wallet मध्ये पुरेशी रक्कम नाही."
        );
      }

      throw new HttpsError(
        "internal",
        "Wallet debit करण्यात समस्या आली."
      );
    }

    // =====================================================
    // SUCCESS RESPONSE
    // =====================================================

    console.log(
      "DL PDF SUCCESS"
    );

    console.log(
      "Transaction:",
      transactionId
    );

    console.log(
      "Amount:",
      SERVICE_CHARGE
    );

    console.log(
      "Remaining Balance:",
      remainingBalance
    );

    return {
      success: true,

      message:
        apiData?.message ||
        "DL card generated successfully.",

      dlNumber,

      dob,

      pdf:
        cleanPdfBase64,

      amount:
        SERVICE_CHARGE,

      transactionId,

      requestId,

      providerOrderId:
        apiData?.order_id ||
        null,

      remainingBalance,
    };
  }
);

exports.instantLlPass = onCall(
  {
    region: "asia-south1",
    secrets: [PARIPRINT_API_KEY],
    timeoutSeconds: 60,
    memory: "256MiB",
  },
  async (request) => {
    // ----------------------------------------------------------
    // AUTH
    // ----------------------------------------------------------

    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "कृपया प्रथम लॉगिन करा."
      );
    }

    const uid = request.auth.uid;

    // ----------------------------------------------------------
    // INPUT
    // ----------------------------------------------------------

    const {
      app_no,
      dob,
      password,
      State,
    } = request.data || {};

    const applicationNumber =
      String(app_no || "").trim();

    const dateOfBirth =
      String(dob || "").trim();

    const llPassword =
      String(password || "").trim();

    const state =
      String(State || "")
        .trim()
        .toUpperCase();

    // ----------------------------------------------------------
    // VALIDATE APPLICATION
    // ----------------------------------------------------------

    if (!applicationNumber) {
      throw new HttpsError(
        "invalid-argument",
        "कृपया Application Number टाका."
      );
    }

    if (
      !/^[A-Za-z0-9-]{5,30}$/.test(
        applicationNumber
      )
    ) {
      throw new HttpsError(
        "invalid-argument",
        "कृपया योग्य Application Number टाका."
      );
    }

    // ----------------------------------------------------------
    // VALIDATE DOB
    // ----------------------------------------------------------

    const dobRegex =
      /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-\d{4}$/;

    if (!dateOfBirth) {
      throw new HttpsError(
        "invalid-argument",
        "कृपया Date of Birth टाका."
      );
    }

    if (!dobRegex.test(dateOfBirth)) {
      throw new HttpsError(
        "invalid-argument",
        "DOB DD-MM-YYYY format मध्ये टाका."
      );
    }

    // ----------------------------------------------------------
    // VALIDATE PASSWORD
    // ----------------------------------------------------------

    if (!llPassword) {
      throw new HttpsError(
        "invalid-argument",
        "कृपया LL Test Password टाका."
      );
    }

    // ----------------------------------------------------------
    // VALIDATE STATE
    // ----------------------------------------------------------

    if (!state) {
      throw new HttpsError(
        "invalid-argument",
        "कृपया State निवडा."
      );
    }

    if (!/^[A-Z]{2,20}$/.test(state)) {
      throw new HttpsError(
        "invalid-argument",
        "कृपया योग्य State निवडा."
      );
    }

    // ----------------------------------------------------------
    // CHARGE
    // ----------------------------------------------------------

    const SERVICE_CHARGE = 120;

    // ----------------------------------------------------------
    // USER
    // ----------------------------------------------------------

    const userRef =
      db.collection("users").doc(uid);

    const userSnap =
      await userRef.get();

    if (!userSnap.exists) {
      throw new HttpsError(
        "not-found",
        "User profile सापडला नाही."
      );
    }

    const userData =
      userSnap.data() || {};

    const currentBalance =
      Number(
        userData.walletBalance ??
        userData.wallet ??
        userData.balance ??
        0
      );

    if (
      !Number.isFinite(currentBalance) ||
      currentBalance < SERVICE_CHARGE
    ) {
      throw new HttpsError(
        "failed-precondition",
        `Wallet मध्ये पुरेशी रक्कम नाही. या सेवेसाठी ₹${SERVICE_CHARGE} आवश्यक आहेत.`
      );
    }

    // ----------------------------------------------------------
    // API KEY
    // ----------------------------------------------------------

    const apiKey =
      PARIPRINT_API_KEY.value();

    if (!apiKey) {
      console.error(
        "PARIPRINT_API_KEY is missing."
      );

      throw new HttpsError(
        "failed-precondition",
        "Service configuration error."
      );
    }

    // ----------------------------------------------------------
    // PROVIDER REQUEST
    // ----------------------------------------------------------

    const params =
      new URLSearchParams();

    params.set(
      "slug",
      "instant-ll-pass"
    );

    params.set(
      "app_no",
      applicationNumber
    );

    params.set(
      "dob",
      dateOfBirth
    );

    params.set(
      "password",
      llPassword
    );

    params.set(
      "State",
      state
    );

    params.set(
      "api_key",
      apiKey
    );

    const apiUrl =
      `https://pariprint.in/api-proxy.php?${params.toString()}`;

    let providerResponse;

    try {
      providerResponse =
        await fetch(apiUrl, {
          method: "GET",
          headers: {
            Accept:
              "application/json",
          },
        });
    } catch (error) {
      console.error(
        "LL Pass provider request error:",
        error
      );

      throw new HttpsError(
        "unavailable",
        "LL Pass service सध्या उपलब्ध नाही."
      );
    }

    // ----------------------------------------------------------
    // RESPONSE
    // ----------------------------------------------------------

    const rawText =
      await providerResponse.text();

    console.log(
      "LL PASS HTTP STATUS:",
      providerResponse.status
    );

    console.log(
      "LL PASS RESPONSE:",
      rawText.substring(0, 5000)
    );

    let apiData;

    try {
      apiData =
        JSON.parse(rawText);
    } catch (error) {
      throw new HttpsError(
        "unavailable",
        "Provider कडून invalid response मिळाला."
      );
    }

    // ----------------------------------------------------------
    // SUCCESS
    // ----------------------------------------------------------

    const providerStatus =
      apiData?.status;

    const isSuccess =
      providerStatus === true ||
      String(providerStatus)
        .trim()
        .toLowerCase() === "true" ||
      String(providerStatus)
        .trim()
        .toLowerCase() === "success";

    if (!isSuccess) {
      console.warn(
        "LL Pass failed:",
        apiData
      );

      throw new HttpsError(
        "failed-precondition",
        String(
          apiData?.message ||
          "LL Pass request successful झाला नाही. Wallet मधून पैसे deduct केलेले नाहीत."
        )
      );
    }

    // ----------------------------------------------------------
    // PROVIDER ORDER / REQUEST ID
    // ----------------------------------------------------------

    const providerRequestId =
      String(
        apiData?.request_id ||
        apiData?.requestId ||
        apiData?.order_id ||
        apiData?.result_value ||
        ""
      ).trim();

    if (!providerRequestId) {
      console.error(
        "Provider success but no request/order ID:",
        apiData
      );

      throw new HttpsError(
        "unavailable",
        "Provider success मिळाला पण Request ID मिळाला नाही. Wallet मधून पैसे deduct केलेले नाहीत."
      );
    }

    // ----------------------------------------------------------
    // FIRESTORE DOCUMENT IDS
    // ----------------------------------------------------------

    const applicantRef =
      db.collection(
        "llPassApplicants"
      ).doc();

    const transactionRef =
      db.collection(
        "walletTransactions"
      ).doc();

    let newBalance = 0;

    // ----------------------------------------------------------
    // ATOMIC WALLET + APPLICANT RECORD
    // ----------------------------------------------------------

    try {
      await db.runTransaction(
        async (transaction) => {
          const freshUserSnap =
            await transaction.get(
              userRef
            );

          if (!freshUserSnap.exists) {
            throw new HttpsError(
              "not-found",
              "User profile सापडला नाही."
            );
          }

          const freshUserData =
            freshUserSnap.data() || {};

          const walletBalance =
            Number(
              freshUserData.walletBalance ??
              freshUserData.wallet ??
              freshUserData.balance ??
              0
            );

          if (
            !Number.isFinite(
              walletBalance
            ) ||
            walletBalance < SERVICE_CHARGE
          ) {
            throw new HttpsError(
              "failed-precondition",
              `Wallet मध्ये ₹${SERVICE_CHARGE} पेक्षा कमी balance आहे.`
            );
          }

          newBalance =
            walletBalance -
            SERVICE_CHARGE;

          // ----------------------------------------------------
          // WALLET UPDATE
          // ----------------------------------------------------

          transaction.update(
            userRef,
            {
              walletBalance:
                newBalance,

              updatedAt:
                admin.firestore.FieldValue.serverTimestamp(),
            }
          );

          // ----------------------------------------------------
          // WALLET TRANSACTION
          // ----------------------------------------------------

          transaction.set(
            transactionRef,
            {
              uid,

              type: "debit",

              amount:
                SERVICE_CHARGE,

              service:
                "INSTANT_LL_PASS",

              serviceName:
                "Instant LL Pass",

              description:
                "Instant Learning Licence Test Pass",

              applicationNumber,

              dob: dateOfBirth,

              state,

              providerRequestId,

              status:
                "success",

              createdAt:
                admin.firestore.FieldValue.serverTimestamp(),

              balanceBefore:
                walletBalance,

              balanceAfter:
                newBalance,
            }
          );

          // ----------------------------------------------------
          // APPLICANT DATA
          //
          // IMPORTANT:
          // PASSWORD IS NOT STORED.
          // ----------------------------------------------------

          transaction.set(
            applicantRef,
            {
              uid,

              applicationNumber,

              dob: dateOfBirth,

              state,

              providerRequestId,

              providerOrderId:
                providerRequestId,

              status:
                "submitted",

              statusMessage:
                String(
                  apiData?.message ||
                  "Request successful."
                ),

              amount:
                SERVICE_CHARGE,

              transactionId:
                transactionRef.id,

              createdAt:
                admin.firestore.FieldValue.serverTimestamp(),

              updatedAt:
                admin.firestore.FieldValue.serverTimestamp(),

              lastStatusCheck:
                null,
            }
          );
        }
      );
    } catch (error) {
      console.error(
        "LL Pass transaction error:",
        error
      );

      if (
        error instanceof HttpsError
      ) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        "LL Pass successful झाला पण wallet transaction पूर्ण झाली नाही."
      );
    }

    // ----------------------------------------------------------
    // RETURN
    // ----------------------------------------------------------

    return {
      success: true,

      message:
        String(
          apiData?.message ||
          "LL Pass request successful."
        ),

      applicationNumber,

      dob: dateOfBirth,

      state,

      requestId:
        providerRequestId,

      orderId:
        providerRequestId,

      applicantId:
        applicantRef.id,

      transactionId:
        transactionRef.id,

      amount:
        SERVICE_CHARGE,

      remainingBalance:
        newBalance,
    };
  }
);


exports.checkLlPassStatus = onCall(
  {
    region: "asia-south1",
    secrets: [PARIPRINT_API_KEY],
    timeoutSeconds: 60,
    memory: "256MiB",
  },
  async (request) => {
    // ----------------------------------------------------------
    // AUTH
    // ----------------------------------------------------------

    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "कृपया प्रथम लॉगिन करा."
      );
    }

    const uid =
      request.auth.uid;

    // ----------------------------------------------------------
    // INPUT
    // ----------------------------------------------------------

    const {
      applicantId,
      orderId,
    } = request.data || {};

    let applicantData = null;
    let applicantRef = null;

    // ----------------------------------------------------------
    // OPTION 1:
    // FIRESTORE APPLICANT ID
    // ----------------------------------------------------------

    if (applicantId) {
      applicantRef =
        db.collection(
          "llPassApplicants"
        ).doc(
          String(applicantId)
        );

      const applicantSnap =
        await applicantRef.get();

      if (!applicantSnap.exists) {
        throw new HttpsError(
          "not-found",
          "LL application सापडली नाही."
        );
      }

      applicantData =
        applicantSnap.data();

      // --------------------------------------------------------
      // SECURITY:
      // USER CAN ONLY CHECK THEIR OWN APPLICATION
      // --------------------------------------------------------

      if (
        applicantData.uid !== uid
      ) {
        throw new HttpsError(
          "permission-denied",
          "ही application तुमची नाही."
        );
      }
    }

    // ----------------------------------------------------------
    // OPTION 2:
    // DIRECT ORDER ID
    // ----------------------------------------------------------

    if (
      !applicantData &&
      orderId
    ) {
      const snapshot =
        await db
          .collection(
            "llPassApplicants"
          )
          .where(
            "uid",
            "==",
            uid
          )
          .where(
            "providerOrderId",
            "==",
            String(orderId)
          )
          .limit(1)
          .get();

      if (
        snapshot.empty
      ) {
        throw new HttpsError(
          "not-found",
          "ही LL application सापडली नाही."
        );
      }

      applicantRef =
        snapshot.docs[0].ref;

      applicantData =
        snapshot.docs[0].data();
    }

    if (!applicantData) {
      throw new HttpsError(
        "invalid-argument",
        "Applicant ID किंवा Order ID आवश्यक आहे."
      );
    }

    // ----------------------------------------------------------
    // ORDER ID
    // ----------------------------------------------------------

    const providerOrderId =
      String(
        applicantData.providerOrderId ||
        applicantData.providerRequestId ||
        ""
      ).trim();

    if (!providerOrderId) {
      throw new HttpsError(
        "failed-precondition",
        "या application साठी provider Order ID उपलब्ध नाही."
      );
    }

    // ----------------------------------------------------------
    // API KEY
    // ----------------------------------------------------------

    const apiKey =
      PARIPRINT_API_KEY.value();

    if (!apiKey) {
      throw new HttpsError(
        "failed-precondition",
        "Service configuration error."
      );
    }

    // ----------------------------------------------------------
    // STATUS API
    // ----------------------------------------------------------

    const params =
      new URLSearchParams();

    params.set(
      "slug",
      "ll-exam-request"
    );

    params.set(
      "api_key",
      apiKey
    );

    params.set(
      "order_id",
      providerOrderId
    );

    const statusUrl =
      `https://pariprint.in/api-proxy.php?${params.toString()}`;

    let providerResponse;

    try {
      providerResponse =
        await fetch(statusUrl, {
          method: "GET",
          headers: {
            Accept:
              "application/json",
          },
        });
    } catch (error) {
      console.error(
        "LL status provider error:",
        error
      );

      throw new HttpsError(
        "unavailable",
        "Status service सध्या उपलब्ध नाही."
      );
    }

    // ----------------------------------------------------------
    // RESPONSE
    // ----------------------------------------------------------

    const rawText =
      await providerResponse.text();

    console.log(
      "LL STATUS HTTP:",
      providerResponse.status
    );

    console.log(
      "LL STATUS RESPONSE:",
      rawText.substring(0, 5000)
    );

    let apiData;

    try {
      apiData =
        JSON.parse(rawText);
    } catch (error) {
      throw new HttpsError(
        "unavailable",
        "Status provider कडून invalid response मिळाला."
      );
    }

    // ----------------------------------------------------------
    // EXTRACT STATUS
    //
    // Different provider responses may use:
    // status
    // exam_status
    // request_status
    // data.status
    // message
    // ----------------------------------------------------------

    const providerStatus =
      apiData?.status ??
      apiData?.exam_status ??
      apiData?.request_status ??
      apiData?.data?.status ??
      apiData?.data?.exam_status ??
      "";

    const statusText =
      String(
        providerStatus ||
        ""
      )
        .trim();

    const statusMessage =
      String(
        apiData?.message ||
        apiData?.data?.message ||
        ""
      ).trim();

    // ----------------------------------------------------------
    // UPDATE FIRESTORE
    // ----------------------------------------------------------

    const updateData = {
      status:
        statusText ||
        applicantData.status ||
        "submitted",

      statusMessage:
        statusMessage ||
        applicantData.statusMessage ||
        "",

      lastStatusCheck:
        admin.firestore.FieldValue.serverTimestamp(),

      updatedAt:
        admin.firestore.FieldValue.serverTimestamp(),
    };

    // Save useful provider fields if available.
    if (
      apiData?.result !== undefined
    ) {
      updateData.providerResult =
        apiData.result;
    }

    if (
      apiData?.data !== undefined
    ) {
      updateData.providerData =
        apiData.data;
    }

    await applicantRef.update(
      updateData
    );

    // ----------------------------------------------------------
    // RETURN
    // ----------------------------------------------------------

    return {
      success: true,

      applicantId:
        applicantRef.id,

      applicationNumber:
        applicantData.applicationNumber,

      dob:
        applicantData.dob,

      state:
        applicantData.state,

      orderId:
        providerOrderId,

      status:
        statusText ||
        applicantData.status ||
        "submitted",

      message:
        statusMessage ||
        "Status मिळाला.",

      providerResponse:
        apiData,
    };
  }
);

exports.instantRcPdfWithoutChip = onCall(
  {
    region: "asia-south1",
    secrets: [PARIPRINT_API_KEY],
    timeoutSeconds: 120,
    memory: "256MiB",
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "कृपया आधी Login करा."
      );
    }

    const uid = request.auth.uid;

    const rcno = String(
      request.data?.rcno || ""
    )
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "");

    if (!rcno) {
      throw new HttpsError(
        "invalid-argument",
        "RC Number टाका."
      );
    }

    // Basic RC validation
    if (!/^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{1,4}$/i.test(rcno)) {
      throw new HttpsError(
        "invalid-argument",
        "कृपया Valid RC Number टाका."
      );
    }

    const SERVICE_CHARGE = 40;

    // ----------------------------------------------------------
    // Check wallet
    // ----------------------------------------------------------

    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      throw new HttpsError(
        "not-found",
        "User account सापडले नाही."
      );
    }

    const userData = userSnap.data() || {};

    const currentBalance = Number(
      userData.walletBalance || 0
    );

    if (currentBalance < SERVICE_CHARGE) {
      throw new HttpsError(
        "failed-precondition",
        `Wallet मध्ये किमान ₹${SERVICE_CHARGE} असणे आवश्यक आहे.`
      );
    }

    // ----------------------------------------------------------
    // Provider API
    // ----------------------------------------------------------

    const apiKey = PARIPRINT_API_KEY.value();

    if (!apiKey) {
      console.error(
        "PARIPRINT_API_KEY is not configured."
      );

      throw new HttpsError(
        "failed-precondition",
        "Service configuration error."
      );
    }

    const apiUrl =
      "https://pariprint.in/api-proxy.php" +
      "?slug=instant-rc-pdf-without-chip" +
      `&rcno=${encodeURIComponent(rcno)}` +
      `&api_key=${encodeURIComponent(apiKey)}`;

    let providerResponse;

    try {
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      const rawText = await response.text();

      console.log(
        "Instant RC Without Chip HTTP:",
        response.status
      );

      console.log(
        "Instant RC Without Chip Response:",
        rawText.substring(0, 1000)
      );

      try {
        providerResponse = JSON.parse(rawText);
      } catch (parseError) {
        console.error(
          "Provider JSON parse error:",
          parseError
        );

        throw new HttpsError(
          "internal",
          "Provider कडून invalid response मिळाला."
        );
      }

      // --------------------------------------------------------
      // Provider success check
      // --------------------------------------------------------

      const providerStatus =
        providerResponse?.status;

      const isSuccess =
        providerStatus === true ||
        providerStatus === "true" ||
        providerStatus === "TRUE" ||
        providerStatus === "success" ||
        providerStatus === "SUCCESS";

      const pdfBase64 =
        providerResponse?.pdf ||
        providerResponse?.data?.pdf ||
        providerResponse?.data?.a4_base64 ||
        "";

      if (!isSuccess || !pdfBase64) {
        console.error(
          "RC PDF generation failed:",
          providerResponse
        );

        throw new HttpsError(
          "failed-precondition",
          providerResponse?.message ||
            "RC PDF तयार होऊ शकला नाही."
        );
      }

      // --------------------------------------------------------
      // Clean Base64
      // --------------------------------------------------------

      const cleanPdfBase64 = String(pdfBase64)
        .replace(
          /^data:application\/pdf;base64,/i,
          ""
        )
        .replace(/\s/g, "");

      if (!cleanPdfBase64) {
        throw new HttpsError(
          "failed-precondition",
          "PDF data रिकामा आहे."
        );
      }

      // Verify it actually looks like a PDF
      let pdfBuffer;

      try {
        pdfBuffer = Buffer.from(
          cleanPdfBase64,
          "base64"
        );
      } catch (error) {
        console.error(
          "PDF Base64 decode error:",
          error
        );

        throw new HttpsError(
          "internal",
          "PDF decode करण्यात अडचण आली."
        );
      }

      if (
        pdfBuffer.length < 100 ||
        pdfBuffer.subarray(0, 4).toString() !== "%PDF"
      ) {
        throw new HttpsError(
          "failed-precondition",
          "Provider कडून valid PDF मिळाला नाही."
        );
      }

      const providerOrderId =
        providerResponse?.order_id ||
        providerResponse?.request_id ||
        null;

      // --------------------------------------------------------
      // Atomic wallet debit
      // --------------------------------------------------------

      let transactionId = null;
      let remainingBalance = null;

      await db.runTransaction(async (transaction) => {
        const freshUserSnap =
          await transaction.get(userRef);

        if (!freshUserSnap.exists) {
          throw new HttpsError(
            "not-found",
            "User account सापडले नाही."
          );
        }

        const freshData =
          freshUserSnap.data() || {};

        const balance = Number(
          freshData.walletBalance || 0
        );

        if (balance < SERVICE_CHARGE) {
          throw new HttpsError(
            "failed-precondition",
            "Wallet balance कमी आहे."
          );
        }

        remainingBalance =
          balance - SERVICE_CHARGE;

        transaction.update(userRef, {
          walletBalance: remainingBalance,
          updatedAt:
            admin.firestore.FieldValue.serverTimestamp(),
        });

        const walletTransactionRef =
          db.collection("walletTransactions").doc();

        transactionId =
          walletTransactionRef.id;

        transaction.set(
          walletTransactionRef,
          {
            uid,

            type: "DEBIT",

            service:
              "INSTANT_RC_PDF_WITHOUT_CHIP",

            serviceName:
              "Instant RC PDF Without Chip",
 description:
                "Instant RC PDF Without Chip",
            amount: SERVICE_CHARGE,

            rcNumber: rcno,

            providerOrderId,

            balanceBefore: balance,

            balanceAfter:
              remainingBalance,

            status: "SUCCESS",

            createdAt:
              admin.firestore.FieldValue.serverTimestamp(),
          }
        );
      });

      // --------------------------------------------------------
      // Save request history
      // --------------------------------------------------------

      const requestRef =
        db.collection("rcPdfWithoutChipRequests").doc();

      await requestRef.set({
        uid,

        rcNumber: rcno,

        providerOrderId,

        transactionId,

        amount: SERVICE_CHARGE,

        status: "SUCCESS",

        providerMessage:
          providerResponse?.message || null,

        filename:
          providerResponse?.filename ||
          `RC_${rcno}.pdf`,

        createdAt:
          admin.firestore.FieldValue.serverTimestamp(),
      });

      // --------------------------------------------------------
      // Return PDF
      // --------------------------------------------------------

      return {
        success: true,

        message:
          providerResponse?.message ||
          "RC PDF तयार आहे.",

        rcNumber: rcno,

        orderId: providerOrderId,

        filename:
          providerResponse?.filename ||
          `RC_${rcno}.pdf`,

        pdf: cleanPdfBase64,

        amount: SERVICE_CHARGE,

        transactionId,

        requestId: requestRef.id,

        remainingBalance,
      };
    } catch (error) {
      console.error(
        "instantRcPdfWithoutChip error:",
        error
      );

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        "RC PDF तयार करताना server error आला."
      );
    }
  }
);

exports.instantNumberLinkWithVoter = onCall(
  {
    region: "asia-south1",
    secrets: [PARIPRINT_API_KEY],
    timeoutSeconds: 120,
    memory: "256MiB",
  },
  async (request) => {
    // ----------------------------------------------------------
    // Authentication
    // ----------------------------------------------------------

    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "कृपया आधी Login करा."
      );
    }

    const uid = request.auth.uid;

    // ----------------------------------------------------------
    // Input
    // ----------------------------------------------------------

    const epic = String(
      request.data?.epic || ""
    )
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "");

    const mobile = String(
      request.data?.mobile || ""
    )
      .trim()
      .replace(/\D/g, "");

    // ----------------------------------------------------------
    // Validate EPIC
    // ----------------------------------------------------------

    if (!epic) {
      throw new HttpsError(
        "invalid-argument",
        "कृपया Voter Number (EPIC) टाका."
      );
    }

    if (epic.length < 5 || epic.length > 20) {
      throw new HttpsError(
        "invalid-argument",
        "कृपया Valid Voter Number टाका."
      );
    }

    // ----------------------------------------------------------
    // Validate Mobile
    // ----------------------------------------------------------

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      throw new HttpsError(
        "invalid-argument",
        "कृपया Valid 10 digit Mobile Number टाका."
      );
    }

    const SERVICE_CHARGE = 40;

    // ----------------------------------------------------------
    // User / Wallet
    // ----------------------------------------------------------

    const userRef = db
      .collection("users")
      .doc(uid);

    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      throw new HttpsError(
        "not-found",
        "User account सापडले नाही."
      );
    }

    const userData =
      userSnap.data() || {};

    const currentBalance = Number(
      userData.walletBalance || 0
    );

    if (currentBalance < SERVICE_CHARGE) {
      throw new HttpsError(
        "failed-precondition",
        `Wallet मध्ये किमान ₹${SERVICE_CHARGE} असणे आवश्यक आहे.`
      );
    }

    // ----------------------------------------------------------
    // API Key
    // ----------------------------------------------------------

    const apiKey =
      PARIPRINT_API_KEY.value();

    if (!apiKey) {
      console.error(
        "PARIPRINT_API_KEY is not configured."
      );

      throw new HttpsError(
        "failed-precondition",
        "Service configuration error."
      );
    }

    // ----------------------------------------------------------
    // Provider API
    // ----------------------------------------------------------

    const apiUrl =
      "https://pariprint.in/api-proxy.php" +
      "?slug=instant-number-link-with-voter" +
      `&epic=${encodeURIComponent(epic)}` +
      `&mobile=${encodeURIComponent(mobile)}` +
      `&api_key=${encodeURIComponent(apiKey)}`;

    let providerData;

    try {
      const response = await fetch(
        apiUrl,
        {
          method: "GET",
          headers: {
            Accept:
              "application/json",
          },
        }
      );

      const rawText =
        await response.text();

      console.log(
        "Voter Link HTTP:",
        response.status
      );

      console.log(
        "Voter Link Response:",
        rawText.substring(0, 2000)
      );

      try {
        providerData =
          JSON.parse(rawText);
      } catch (parseError) {
        console.error(
          "Provider JSON parse error:",
          parseError
        );

        throw new HttpsError(
          "internal",
          "Provider कडून invalid response मिळाला."
        );
      }

      // --------------------------------------------------------
      // Provider Success
      // --------------------------------------------------------

      const providerStatus =
        providerData?.status;

      const isSuccess =
        providerStatus === true ||
        providerStatus === "true" ||
        providerStatus === "TRUE" ||
        providerStatus === "success" ||
        providerStatus === "SUCCESS";

      if (!isSuccess) {
        console.error(
          "Voter mobile linking failed:",
          providerData
        );

        throw new HttpsError(
          "failed-precondition",
          providerData?.message ||
            "Voter Mobile Link Request Failed."
        );
      }

      // --------------------------------------------------------
      // Result / Request ID
      // --------------------------------------------------------

      const result =
        providerData?.result ??
        providerData?.request_id ??
        providerData?.requestId ??
        providerData?.order_id ??
        providerData?.orderId ??
        null;

      // --------------------------------------------------------
      // Atomic Wallet Debit
      // --------------------------------------------------------

      let transactionId = null;
      let remainingBalance = null;

      await db.runTransaction(
        async (transaction) => {
          const freshUserSnap =
            await transaction.get(
              userRef
            );

          if (!freshUserSnap.exists) {
            throw new HttpsError(
              "not-found",
              "User account सापडले नाही."
            );
          }

          const freshData =
            freshUserSnap.data() || {};

          const balance = Number(
            freshData.walletBalance || 0
          );

          if (
            balance <
            SERVICE_CHARGE
          ) {
            throw new HttpsError(
              "failed-precondition",
              "Wallet balance कमी आहे."
            );
          }

          remainingBalance =
            balance -
            SERVICE_CHARGE;

          transaction.update(
            userRef,
            {
              walletBalance:
                remainingBalance,

              updatedAt:
                admin.firestore.FieldValue.serverTimestamp(),
            }
          );

          // Wallet transaction
          const walletTransactionRef =
            db
              .collection(
                "walletTransactions"
              )
              .doc();

          transactionId =
            walletTransactionRef.id;

          transaction.set(
            walletTransactionRef,
            {
              uid,

              type: "DEBIT",

              service:
                "INSTANT_NUMBER_LINK_WITH_VOTER",

              serviceName:
                "Instant Number Link with Voter",

              amount:
                SERVICE_CHARGE,

              epic,

              mobile,

              providerResult:
                result,

              balanceBefore:
                balance,

              balanceAfter:
                remainingBalance,

              status:
                "SUCCESS",

              createdAt:
                admin.firestore.FieldValue.serverTimestamp(),
            }
          );
        }
      );

      // --------------------------------------------------------
      // Save Request
      // --------------------------------------------------------

      const requestRef =
        db
          .collection(
            "numberLinkWithVoterRequests"
          )
          .doc();

      await requestRef.set({
        uid,

        epic,

        mobile,

        providerResult:
          result,

        transactionId,

        amount:
          SERVICE_CHARGE,

        status:
          "SUCCESS",

        providerMessage:
          providerData?.message ||
          null,

        createdAt:
          admin.firestore.FieldValue.serverTimestamp(),

        updatedAt:
          admin.firestore.FieldValue.serverTimestamp(),
      });

      // --------------------------------------------------------
      // Return
      // --------------------------------------------------------

      return {
        success: true,

        message:
          providerData?.message ||
          "Request successful.",

        epic,

        mobile,

        result,

        amount:
          SERVICE_CHARGE,

        transactionId,

        requestId:
          requestRef.id,

        remainingBalance,
      };
    } catch (error) {
      console.error(
        "instantNumberLinkWithVoter error:",
        error
      );

      if (
        error instanceof HttpsError
      ) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        "Voter Mobile Link करताना server error आला."
      );
    }
  }
);

exports.adminCreateUdhari = onCall(
  {
    region: "asia-south1",
    invoker: "public",
    timeoutSeconds: 60,
    memory: "256MiB",
  },
  async (request) => {

    // EXISTING ADMIN AUTH
    checkAdmin(request);

    const uid = String(
      request.data?.uid || ""
    ).trim();

    const amount = Number(
      request.data?.amount || 0
    );

    const service = String(
      request.data?.service || ""
    ).trim();

    const description = String(
      request.data?.description || ""
    ).trim();

    const dueDate = String(
      request.data?.dueDate || ""
    ).trim();

    const note = String(
      request.data?.note || ""
    ).trim();


    /* =====================================================
       VALIDATION
    ===================================================== */

    if (!uid) {
      throw new HttpsError(
        "invalid-argument",
        "User ID is required."
      );
    }


    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Invalid udhari amount."
      );
    }


    if (!dueDate) {
      throw new HttpsError(
        "invalid-argument",
        "Due date is required."
      );
    }


    /* =====================================================
       USER
    ===================================================== */

    const userRef = db
      .collection("users")
      .doc(uid);

    const userSnap =
      await userRef.get();


    if (!userSnap.exists) {
      throw new HttpsError(
        "not-found",
        "User account not found."
      );
    }


    const userData =
      userSnap.data();


    /* =====================================================
       CREATE UDHARI
    ===================================================== */

    const udhariRef =
      db.collection("udhari").doc();


    const now =
      admin.firestore.FieldValue
        .serverTimestamp();


    const udhariData = {

      uid,

      userName:
        userData.name ||
        "",

      userEmail:
        userData.email ||
        "",

      userMobile:
        userData.mobile ||
        "",


      totalAmount:
        amount,

      paidAmount:
        0,

      remainingAmount:
        amount,

      paymentCount:
        0,


      service:
        service ||
        "उधारी",

      description:
        description ||
        "",

      note:
        note ||
        "",

      dueDate,


      status:
        "PENDING",


      createdBy:
        request.auth.uid,

      createdByEmail:
        request.auth.token?.email ||
        "",

      updatedBy:
        request.auth.uid,

      updatedByEmail:
        request.auth.token?.email ||
        "",


      createdAt:
        now,

      updatedAt:
        now,

    };


    await udhariRef.set(
      udhariData
    );


    return {

      success:
        true,

      udhariId:
        udhariRef.id,

      message:
        "Udhari successfully created.",

    };

  }
);

exports.adminAddUdhariPayment = onCall(
  {
    region: "asia-south1",
    invoker: "public",
    timeoutSeconds: 60,
    memory: "256MiB",
  },
  async (request) => {

    // EXISTING ADMIN AUTH
    checkAdmin(request);


    /* =====================================================
       INPUT
    ===================================================== */

    const udhariId =
      String(
        request.data?.udhariId ||
        ""
      ).trim();


    const amount =
      Number(
        request.data?.amount ||
        0
      );


    const paymentDate =
      request.data?.paymentDate
        ? String(
            request.data.paymentDate
          ).trim()
        : null;


    const note =
      String(
        request.data?.note ||
        ""
      ).trim();


    /* =====================================================
       VALIDATION
    ===================================================== */

    if (!udhariId) {

      throw new HttpsError(
        "invalid-argument",
        "Udhari ID is required."
      );

    }


    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {

      throw new HttpsError(
        "invalid-argument",
        "Invalid payment amount."
      );

    }


    /* =====================================================
       REFERENCES
    ===================================================== */

    const udhariRef =
      db
        .collection("udhari")
        .doc(udhariId);


    const paymentRef =
      udhariRef
        .collection("payments")
        .doc();


    let result;


    /* =====================================================
       TRANSACTION
    ===================================================== */

    try {

      result =
        await db.runTransaction(
          async (transaction) => {

            const udhariSnap =
              await transaction.get(
                udhariRef
              );


            if (
              !udhariSnap.exists
            ) {

              throw new HttpsError(
                "not-found",
                "Udhari account not found."
              );

            }


            const data =
              udhariSnap.data();


            const totalAmount =
              Number(
                data.totalAmount ||
                0
              );


            const paidAmount =
              Number(
                data.paidAmount ||
                0
              );


            const remainingAmount =
              Number(
                data.remainingAmount ??
                (
                  totalAmount -
                  paidAmount
                )
              );


            /* =================================================
               ALREADY PAID
            ================================================= */

            if (
              remainingAmount <= 0
            ) {

              throw new HttpsError(
                "failed-precondition",
                "This udhari is already fully paid."
              );

            }


            /* =================================================
               PAYMENT CANNOT EXCEED REMAINING
            ================================================= */

            if (
              amount >
              remainingAmount
            ) {

              throw new HttpsError(
                "invalid-argument",
                `Payment cannot exceed remaining amount. Remaining: ₹${remainingAmount}`
              );

            }


            /* =================================================
               NEW TOTALS
            ================================================= */

            const newPaidAmount =
              paidAmount +
              amount;


            const newRemainingAmount =
              Math.max(
                0,
                totalAmount -
                  newPaidAmount
              );


            /* =================================================
               STATUS
            ================================================= */

            let newStatus =
              "PENDING";


            if (
              newRemainingAmount <= 0
            ) {

              newStatus =
                "PAID";

            } else if (
              newPaidAmount > 0
            ) {

              newStatus =
                "PARTIAL";

            }


            /* =================================================
               PAYMENT COUNT
            ================================================= */

            const currentPaymentCount =
              Number(
                data.paymentCount ||
                0
              );


            const newPaymentCount =
              currentPaymentCount +
              1;


            /* =================================================
               PAYMENT DOCUMENT
            ================================================= */

            const paymentData = {

              amount,

              paymentDate:
                paymentDate ||
                null,

              note:
                note ||
                "",

              createdAt:
                admin.firestore
                  .FieldValue
                  .serverTimestamp(),

              createdBy:
                request.auth.uid,

              createdByEmail:
                request.auth.token?.email ||
                "",

            };


            /* =================================================
               UPDATE UDHARI
            ================================================= */

            transaction.update(
              udhariRef,
              {

                paidAmount:
                  newPaidAmount,

                remainingAmount:
                  newRemainingAmount,

                paymentCount:
                  newPaymentCount,

                status:
                  newStatus,

                lastPaymentAmount:
                  amount,

                lastPaymentDate:
                  paymentDate ||
                  null,

                updatedBy:
                  request.auth.uid,

                updatedByEmail:
                  request.auth.token?.email ||
                  "",

                updatedAt:
                  admin.firestore
                    .FieldValue
                    .serverTimestamp(),

              }
            );


            /* =================================================
               CREATE PAYMENT HISTORY
            ================================================= */

            transaction.set(
              paymentRef,
              paymentData
            );


            return {

              paymentId:
                paymentRef.id,

              totalAmount,

              paidAmount:
                newPaidAmount,

              remainingAmount:
                newRemainingAmount,

              paymentCount:
                newPaymentCount,

              status:
                newStatus,

            };

          }
        );


    } catch (error) {

      console.error(
        "Admin add udhari payment error:",
        error
      );


      if (
        error instanceof
        HttpsError
      ) {

        throw error;

      }


      throw new HttpsError(
        "internal",
        "Could not add udhari payment."
      );

    }


    /* =====================================================
       RESPONSE
    ===================================================== */

    return {

      success:
        true,

      ...result,

      message:
        result.status ===
        "PAID"

          ? "पूर्ण payment जमा झाले. Udhari PAID झाली."

          : "Payment successfully added.",

    };

  }
);

// =========================================================
// ADMIN ADD MONEY TO USER WALLET
// =========================================================

exports.adminAddWalletMoney = onCall(
  {
    region: "asia-south1",
    invoker: "public",
    timeoutSeconds: 60,
    memory: "256MiB"
  },
  async (request) => {
    // IMPORTANT:
    // Use the same admin authorization used
    // by existing admin functions.
    checkAdmin(request);

    const {
      uid,
      amount,
      note
    } = request.data || {};

    // -------------------------------------------------------
    // VALIDATION
    // -------------------------------------------------------

    if (
      !uid ||
      typeof uid !== "string"
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Invalid user ID."
      );
    }

    const numericAmount =
      Number(amount);

    if (
      !Number.isFinite(
        numericAmount
      ) ||
      numericAmount <= 0
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Invalid amount."
      );
    }

    if (
      !Number.isInteger(
        numericAmount
      )
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Amount must be a whole number."
      );
    }

    if (
      numericAmount > 500000
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Maximum ₹5,00,000 can be added at once."
      );
    }

    // -------------------------------------------------------
    // USER
    // -------------------------------------------------------

    const userRef = db
      .collection("users")
      .doc(uid);

    // -------------------------------------------------------
    // ATOMIC WALLET UPDATE
    // -------------------------------------------------------

    const result =
      await db.runTransaction(
        async (transaction) => {
          const userSnap =
            await transaction.get(
              userRef
            );

          if (!userSnap.exists) {
            throw new HttpsError(
              "not-found",
              "User not found."
            );
          }

          const userData =
            userSnap.data() || {};

          const oldWalletBalance =
            Number(
              userData.walletBalance ||
                0
            );

          const oldAvailableBalance =
            Number(
              userData.availableBalance ??
                oldWalletBalance
            );

          const newWalletBalance =
            oldWalletBalance +
            numericAmount;

          const newAvailableBalance =
            oldAvailableBalance +
            numericAmount;

          // ---------------------------------------------------
          // USER PROFILE UPDATE
          // ---------------------------------------------------

          transaction.update(
            userRef,
            {
              walletBalance:
                newWalletBalance,

              availableBalance:
                newAvailableBalance,

              updatedAt:
                admin.firestore.FieldValue.serverTimestamp()
            }
          );

          // ---------------------------------------------------
          // WALLET TRANSACTION
          // ---------------------------------------------------

          const transactionRef =
            db
              .collection(
                "walletTransactions"
              )
              .doc();

          transaction.set(
            transactionRef,
            {
              uid,

              userId: uid,

              type:
                "ADMIN_WALLET_CREDIT",

              service:
                "ADMIN_WALLET_CREDIT",

              serviceName:
                "Admin Wallet Credit",

              description:
                note?.trim()
                  ? note.trim()
                  : "Admin ने wallet मध्ये पैसे जमा केले",

              amount:
                numericAmount,

              isCredit:
                true,

              status:
                "success",

              balanceBefore:
                oldWalletBalance,

              balanceAfter:
                newWalletBalance,

              availableBalanceBefore:
                oldAvailableBalance,

              availableBalanceAfter:
                newAvailableBalance,

              createdAt:
                admin.firestore.FieldValue.serverTimestamp(),

              createdBy:
                request.auth.uid,

              createdByEmail:
                request.auth.token?.email ||
                null
            }
          );

          return {
            walletBalance:
              newWalletBalance,

            availableBalance:
              newAvailableBalance,

            transactionId:
              transactionRef.id
          };
        }
      );

    return {
      success: true,

      message:
        "Wallet money added successfully.",

      walletBalance:
        result.walletBalance,

      availableBalance:
        result.availableBalance,

      transactionId:
        result.transactionId
    };
  }
);

exports.payUdhariFromWallet = onCall(
  {
    region: "asia-south1",
    invoker: "public",
    timeoutSeconds: 60,
    memory: "256MiB",
  },
  async (request) => {

    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "कृपया Login करा."
      );
    }

    const uid =
      request.auth.uid;

    const {
      udhariId,
      amount
    } = request.data || {};

    const paymentAmount =
      Number(amount);

    if (
      !udhariId ||
      !Number.isFinite(paymentAmount) ||
      paymentAmount <= 0
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Invalid payment details."
      );
    }

    const userRef =
      db.collection("users").doc(uid);

    const udhariRef =
      db.collection("udhari").doc(udhariId);

    const paymentRef =
      udhariRef
        .collection("payments")
        .doc();

    const walletTransactionRef =
      db
        .collection("walletTransactions")
        .doc();

    const result =
      await db.runTransaction(
        async (transaction) => {

          const [
            userSnap,
            udhariSnap
          ] = await Promise.all([
            transaction.get(userRef),
            transaction.get(udhariRef)
          ]);

          if (!userSnap.exists) {
            throw new HttpsError(
              "not-found",
              "User account not found."
            );
          }

          if (!udhariSnap.exists) {
            throw new HttpsError(
              "not-found",
              "Udhari record not found."
            );
          }

          const userData =
            userSnap.data() || {};

          const udhariData =
            udhariSnap.data() || {};

          if (
            udhariData.uid !== uid
          ) {
            throw new HttpsError(
              "permission-denied",
              "ही उधारी तुमच्या खात्याची नाही."
            );
          }

          const walletBalance =
            Number(
              userData.walletBalance ??
              userData.wallet ??
              0
            );

          const availableBalance =
            Number(
              userData.availableBalance ??
              walletBalance
            );

          const paidAmount =
            Number(
              udhariData.paidAmount || 0
            );

          const totalAmount =
            Number(
              udhariData.totalAmount || 0
            );

          const remainingAmount =
            Number(
              udhariData.remainingAmount ??
              (
                totalAmount -
                paidAmount
              )
            );

          if (
            remainingAmount <= 0
          ) {
            throw new HttpsError(
              "failed-precondition",
              "ही उधारी आधीच पूर्ण भरलेली आहे."
            );
          }

          if (
            paymentAmount >
            remainingAmount
          ) {
            throw new HttpsError(
              "failed-precondition",
              `जास्तीत जास्त ₹${remainingAmount} भरता येतील.`
            );
          }

          if (
            paymentAmount >
            availableBalance
          ) {
            throw new HttpsError(
              "failed-precondition",
              `Wallet मध्ये पुरेशी रक्कम नाही. उपलब्ध Balance ₹${availableBalance}.`
            );
          }

          const newWalletBalance =
            walletBalance -
            paymentAmount;

          const newAvailableBalance =
            availableBalance -
            paymentAmount;

          const newPaidAmount =
            paidAmount +
            paymentAmount;

          const newRemainingAmount =
            Math.max(
              0,
              remainingAmount -
              paymentAmount
            );

          const newPaymentCount =
            Number(
              udhariData.paymentCount ||
              0
            ) + 1;

          const newStatus =
            newRemainingAmount <= 0
              ? "PAID"
              : "PARTIAL";


          /* USER WALLET */

          transaction.update(
            userRef,
            {
              walletBalance:
                newWalletBalance,

              availableBalance:
                newAvailableBalance,

              updatedAt:
                admin.firestore.FieldValue
                  .serverTimestamp()
            }
          );


          /* UDHARI */

          transaction.update(
            udhariRef,
            {
              paidAmount:
                newPaidAmount,

              remainingAmount:
                newRemainingAmount,

              paymentCount:
                newPaymentCount,

              status:
                newStatus,

              lastPaymentAmount:
                paymentAmount,

              lastPaymentDate:
                admin.firestore.FieldValue
                  .serverTimestamp(),

              updatedAt:
                admin.firestore.FieldValue
                  .serverTimestamp(),

              updatedBy:
                uid
            }
          );


          /* PAYMENT HISTORY */

          transaction.set(
            paymentRef,
            {
              amount:
                paymentAmount,

              paymentDate:
                admin.firestore.FieldValue
                  .serverTimestamp(),

              note:
                "Wallet मधून Udhari Payment",

              paymentMethod:
                "WALLET",

              createdAt:
                admin.firestore.FieldValue
                  .serverTimestamp(),

              createdBy:
                uid
            }
          );


          /* WALLET TRANSACTION */

          transaction.set(
            walletTransactionRef,
            {
              uid,

              userId:
                uid,

              type:
                "DEBIT",

              service:
                "UDHARI_PAYMENT",

              amount:
                paymentAmount,

              isCredit:
                false,

              udhariId,

              description:
                "Udhari payment from wallet",

              balanceBefore:
                walletBalance,

              balanceAfter:
                newWalletBalance,

              availableBalanceBefore:
                availableBalance,

              availableBalanceAfter:
                newAvailableBalance,

              createdAt:
                admin.firestore.FieldValue
                  .serverTimestamp()
            }
          );


          return {

            walletBalance:
              newWalletBalance,

            availableBalance:
              newAvailableBalance,

            paidAmount:
              newPaidAmount,

            remainingAmount:
              newRemainingAmount,

            paymentCount:
              newPaymentCount,

            status:
              newStatus

          };

        }
      );


    return {
      success: true,
      ...result
    };

  }
);
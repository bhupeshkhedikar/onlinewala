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
    console.log("🚀 instantPanFind FUNCTION STARTED");
    console.log("========================================");

    try {
      /*
       * STEP 1
       * Authentication
       */
      console.log("STEP 1: Checking authentication...");

      if (!request.auth) {
        console.error("❌ User is NOT authenticated.");

        throw new HttpsError(
          "unauthenticated",
          "कृपया आधी Login करा."
        );
      }

      const userId = request.auth.uid;

      console.log(
        "✅ User authenticated:",
        userId
      );

      /*
       * STEP 2
       * Get Aadhaar number
       *
       * IMPORTANT:
       * We NEVER log the actual Aadhaar number.
       */
      console.log("STEP 2: Validating Aadhaar...");

      const aadhaarNumber = String(
        request.data?.aadhaarNumber || ""
      ).replace(/\D/g, "");

      console.log(
        "Aadhaar received:",
        aadhaarNumber
          ? "YES"
          : "NO"
      );

      console.log(
        "Aadhaar length:",
        aadhaarNumber.length
      );

      if (!/^\d{12}$/.test(aadhaarNumber)) {
        console.error(
          "❌ Invalid Aadhaar number."
        );

        throw new HttpsError(
          "invalid-argument",
          "12 अंकी Aadhaar Number required आहे."
        );
      }

      console.log(
        "✅ Aadhaar validation successful."
      );

      /*
       * STEP 3
       * Service amount
       */
      const SERVICE_AMOUNT = 10;

      console.log(
        `STEP 3: Service amount = ₹${SERVICE_AMOUNT}`
      );

      /*
       * STEP 4
       * Get user wallet
       */
      console.log(
        "STEP 4: Checking wallet balance..."
      );

      const userRef = db
        .collection("users")
        .doc(userId);

      const userSnap =
        await userRef.get();

      if (!userSnap.exists) {
        console.error(
          "❌ User profile not found:",
          userId
        );

        throw new HttpsError(
          "not-found",
          "User profile सापडला नाही."
        );
      }

      const userData =
        userSnap.data();

      const availableBalance =
        Number(
          userData.availableBalance || 0
        );

      const walletBalance =
        Number(
          userData.walletBalance || 0
        );

      console.log(
        "Wallet balance:",
        walletBalance
      );

      console.log(
        "Available balance:",
        availableBalance
      );

      if (
        availableBalance <
        SERVICE_AMOUNT
      ) {
        console.error(
          `❌ Insufficient balance. Available ₹${availableBalance}, Required ₹${SERVICE_AMOUNT}`
        );

        throw new HttpsError(
          "failed-precondition",
          `तुमच्या wallet मध्ये कमीत कमी ₹${SERVICE_AMOUNT} available असणे आवश्यक आहे.`
        );
      }

      console.log(
        "✅ Wallet balance sufficient."
      );

      /*
       * STEP 5
       * Get Pariprint API key
       *
       * Secret is NEVER logged.
       */
      console.log(
        "STEP 5: Checking Pariprint API configuration..."
      );

      const apiKey =
        PARIPRINT_API_KEY.value();

      if (!apiKey) {
        console.error(
          "❌ PARIPRINT_API_KEY is NOT configured."
        );

        throw new HttpsError(
          "internal",
          "PAN service configuration missing."
        );
      }

      console.log(
        "✅ Pariprint API key is configured."
      );

      /*
       * STEP 6
       * Build Pariprint API URL
       */
      console.log(
        "STEP 6: Preparing Pariprint API request..."
      );

      const apiUrl =
        new URL(
          "https://pariprint.in/api-proxy.php"
        );

      apiUrl.searchParams.set(
        "slug",
        "instant-pan-find"
      );

      apiUrl.searchParams.set(
        "aadhaar_number",
        aadhaarNumber
      );

      apiUrl.searchParams.set(
        "api_key",
        apiKey
      );

      console.log(
        "Pariprint endpoint:",
        "https://pariprint.in/api-proxy.php"
      );

      console.log(
        "Pariprint slug:",
        "instant-pan-find"
      );

      /*
       * DO NOT log apiUrl.toString()
       * because it contains the secret API key.
       */

      /*
       * STEP 7
       * Call Pariprint
       */
      console.log(
        "STEP 7: Calling Pariprint API..."
      );

      let apiResponse;

      try {
        apiResponse =
          await fetch(
            apiUrl.toString(),
            {
              method: "GET",

              headers: {
                Accept:
                  "application/json",
              },
            }
          );

        console.log(
          "✅ Pariprint API request completed."
        );

        console.log(
          "Pariprint HTTP status:",
          apiResponse.status
        );

        console.log(
          "Pariprint HTTP status text:",
          apiResponse.statusText
        );

      } catch (error) {
        console.error(
          "❌ Pariprint network error."
        );

        console.error(
          "Error name:",
          error?.name
        );

        console.error(
          "Error message:",
          error?.message
        );

        throw new HttpsError(
          "unavailable",
          "PAN service temporarily unavailable."
        );
      }

      /*
       * STEP 8
       * Read API response
       */
      console.log(
        "STEP 8: Reading Pariprint response..."
      );

      let apiData;

      try {
        apiData =
          await apiResponse.json();

        /*
         * IMPORTANT:
         * This logs the actual API response
         * so we can verify the structure.
         *
         * Do NOT log Aadhaar.
         */
        console.log(
          "📦 PARIPRINT RESPONSE:"
        );

        console.log(
          JSON.stringify(
            apiData,
            null,
            2
          )
        );

      } catch (error) {
        console.error(
          "❌ Failed to parse Pariprint JSON response."
        );

        console.error(
          "Error message:",
          error?.message
        );

        throw new HttpsError(
          "internal",
          "PAN service returned an invalid response."
        );
      }

      /*
       * STEP 9
       * Check API response
       */
      console.log(
        "STEP 9: Checking Pariprint response..."
      );

      console.log(
        "API status field:",
        apiData?.status
      );

      console.log(
        "API message:",
        apiData?.message
      );

      console.log(
        "PAN field exists:",
        Boolean(
          apiData?.pan_number
        )
      );

      /*
       * Extract PAN
       */
      const panNumber =
        String(
          apiData?.pan_number || ""
        )
          .trim()
          .toUpperCase();

      console.log(
        "PAN extracted:",
        panNumber
          ? "YES"
          : "NO"
      );

      /*
       * Validate PAN format
       */
      const validPanFormat =
        /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(
          panNumber
        );

      console.log(
        "PAN format valid:",
        validPanFormat
      );

      const apiSuccess =
        apiData?.status === true &&
        validPanFormat;

      console.log(
        "Final API success:",
        apiSuccess
      );

      /*
       * IMPORTANT:
       * If API is not successful,
       * wallet is NOT debited.
       */
      if (!apiSuccess) {
        console.error(
          "❌ PAN FIND FAILED."
        );

        console.error(
          "Provider message:",
          apiData?.message ||
            "PAN Number not found."
        );

        throw new HttpsError(
          "failed-precondition",
          apiData?.message ||
            "PAN Number सापडला नाही."
        );
      }

      console.log(
        "🎉 PAN FIND SUCCESSFUL."
      );

      /*
       * STEP 10
       * Prepare wallet transaction
       */
      console.log(
        "STEP 10: Preparing wallet debit..."
      );

      const walletTransactionRef =
        db
          .collection(
            "walletTransactions"
          )
          .doc();

      const panRequestRef =
        db
          .collection(
            "panFindRequests"
          )
          .doc();

      let finalBalance = 0;

      /*
       * STEP 11
       * Atomic wallet transaction
       */
      console.log(
        "STEP 11: Starting Firestore transaction..."
      );

      await db.runTransaction(
        async (transaction) => {

          console.log(
            "Reading fresh wallet balance..."
          );

          const freshUserSnap =
            await transaction.get(
              userRef
            );

          if (
            !freshUserSnap.exists
          ) {
            console.error(
              "❌ User disappeared during transaction."
            );

            throw new HttpsError(
              "not-found",
              "User profile सापडला नाही."
            );
          }

          const freshUser =
            freshUserSnap.data();

          const currentAvailable =
            Number(
              freshUser.availableBalance ||
                0
            );

          const currentWallet =
            Number(
              freshUser.walletBalance ||
                0
            );

          console.log(
            "Fresh available balance:",
            currentAvailable
          );

          console.log(
            "Fresh wallet balance:",
            currentWallet
          );

          /*
           * Re-check balance
           * immediately before debit.
           */
          if (
            currentAvailable <
            SERVICE_AMOUNT
          ) {
            console.error(
              "❌ Wallet became insufficient before debit."
            );

            throw new HttpsError(
              "failed-precondition",
              "Wallet balance insufficient आहे."
            );
          }

          const newAvailable =
            currentAvailable -
            SERVICE_AMOUNT;

          const newWallet =
            Math.max(
              0,
              currentWallet -
                SERVICE_AMOUNT
            );

          finalBalance =
            newAvailable;

          console.log(
            "New available balance:",
            newAvailable
          );

          console.log(
            "New wallet balance:",
            newWallet
          );

          /*
           * Update wallet
           */
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

          /*
           * Create wallet transaction
           */
          transaction.set(
            walletTransactionRef,
            {
              userId,

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
                admin.firestore
                  .FieldValue
                  .serverTimestamp(),
            }
          );

          /*
           * Create PAN request record
           *
           * Aadhaar is NOT stored.
           */
          transaction.set(
            panRequestRef,
            {
              userId,

              service:
                "INSTANT_PAN_FIND",

              status:
                "success",

              amount:
                SERVICE_AMOUNT,

              panNumber,

              provider:
                "pariprint",

              walletTransactionId:
                walletTransactionRef.id,

              createdAt:
                admin.firestore
                  .FieldValue
                  .serverTimestamp(),
            }
          );

          console.log(
            "✅ Wallet update prepared."
          );

          console.log(
            "✅ Wallet transaction prepared:",
            walletTransactionRef.id
          );

          console.log(
            "✅ PAN request prepared:",
            panRequestRef.id
          );
        }
      );

      /*
       * STEP 12
       * Final success
       */
      console.log(
        "========================================"
      );

      console.log(
        "🎉 instantPanFind SUCCESS"
      );

      console.log(
        "PAN:",
        panNumber
      );

      console.log(
        "Amount debited:",
        `₹${SERVICE_AMOUNT}`
      );

      console.log(
        "Remaining balance:",
        finalBalance
      );

      console.log(
        "Wallet transaction:",
        walletTransactionRef.id
      );

      console.log(
        "========================================"
      );

      return {
        success: true,

        panNumber,

        amount:
          SERVICE_AMOUNT,

        transactionId:
          walletTransactionRef.id,

        remainingBalance:
          finalBalance,

        message:
          "Aadhaar to PAN find successful.",
      };

    } catch (error) {

      /*
       * IMPORTANT ERROR LOG
       */
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

      /*
       * Preserve Firebase HttpsError
       */
      if (
        error instanceof HttpsError
      ) {
        throw error;
      }

      /*
       * Convert unknown errors
       * to internal error.
       */
      throw new HttpsError(
        "internal",
        "Instant PAN Find service मध्ये unexpected error आला."
      );
    }
  }
);
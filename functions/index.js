
const {
  onCall,
  onRequest,
  HttpsError,
} = require("firebase-functions/v2/https");

const { onDocumentCreated } = require("firebase-functions/v2/firestore");

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
const WHATSAPP_ACCESS_TOKEN = defineSecret("WHATSAPP_ACCESS_TOKEN");
const WHATSAPP_PHONE_NUMBER_ID = defineSecret("WHATSAPP_PHONE_NUMBER_ID");
const WHATSAPP_VERIFY_TOKEN = defineSecret("WHATSAPP_VERIFY_TOKEN");
const META_APP_SECRET = defineSecret("META_APP_SECRET");
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

      const resolvedUser =
        await resolveOnlineWalaaUser(request);

      const userId =
        resolvedUser.userId;

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

      const resolvedUser =
        await resolveOnlineWalaaUser(request);

      const userId =
        resolvedUser.userId;

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
          request.data?.referralId || ""
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
            async (transaction) => {
              // =====================================================
              // GET REFERRAL
              // =====================================================

              const referralSnap =
                await transaction.get(
                  referralRef
                );

              if (!referralSnap.exists) {
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

              // =====================================================
              // ALREADY CONFIRMED
              // =====================================================

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

              // =====================================================
              // ALREADY REJECTED
              // =====================================================

              if (
                currentStatus ===
                "rejected"
              ) {
                throw new HttpsError(
                  "failed-precondition",
                  "This referral has already been rejected."
                );
              }

              // =====================================================
              // ONLY PENDING / APPROVED CAN BE APPROVED
              // =====================================================

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

              // =====================================================
              // REFERRER ID
              // =====================================================

              const referrerId =
                referral.referrerId;

              if (!referrerId) {
                throw new HttpsError(
                  "invalid-argument",
                  "Referral referrerId is missing."
                );
              }

              // =====================================================
              // GET REFERRER USER
              // =====================================================

              const referrerRef =
                db
                  .collection("users")
                  .doc(referrerId);

              const referrerSnap =
                await transaction.get(
                  referrerRef
                );

              if (!referrerSnap.exists) {
                throw new HttpsError(
                  "not-found",
                  "Referrer user account not found."
                );
              }

              const referrer =
                referrerSnap.data();

              // =====================================================
              // REWARD AMOUNT
              // =====================================================

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

              // =====================================================
              // CURRENT WALLET VALUES
              // =====================================================

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

              const currentPendingReferral =
                Number(
                  referrer.pendingReferralAmount ||
                    0
                );

              // =====================================================
              // ADD REWARD TO AVAILABLE BALANCE
              // REMOVE REWARD FROM PENDING
              // =====================================================

              const newAvailable =
                currentAvailable +
                rewardAmount;

              const newPendingReferral =
                Math.max(
                  0,
                  currentPendingReferral -
                    rewardAmount
                );

              // =====================================================
              // UPDATE USER WALLET
              // =====================================================

              transaction.update(
                referrerRef,
                {
                  // Keep existing walletBalance
                  walletBalance:
                    currentWallet,

                  // Add approved referral reward
                  availableBalance:
                    newAvailable,

                  // Remove approved reward
                  // from pending referral amount
                  pendingReferralAmount:
                    newPendingReferral,

                  updatedAt:
                    admin.firestore
                      .FieldValue
                      .serverTimestamp(),
                }
              );

              // =====================================================
              // CREATE WALLET TRANSACTION
              // =====================================================

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
                    request.auth.token
                      ?.email || "",

                  createdAt:
                    admin.firestore
                      .FieldValue
                      .serverTimestamp(),
                }
              );

              // =====================================================
              // UPDATE REFERRAL
              // =====================================================

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
                    request.auth.token
                      ?.email || "",

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

              // =====================================================
              // RETURN RESULT
              // =====================================================

              return {
                alreadyProcessed:
                  false,

                amount:
                  rewardAmount,

                referrerId:
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

      // =====================================================
      // FINAL RESPONSE
      // =====================================================

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

      const resolvedUser =
        await resolveOnlineWalaaUser(request);

      const uid =
        resolvedUser.userId;

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

/* =========================================================
   USER → ONLINEWALAA WALLET PAYMENT
   ========================================================= */

/*
 * IMPORTANT:
 * Firebase Phone/OTP login UID can be different from the UID
 * used by the existing users/{uid} profile.
 *
 * This helper first tries the Firebase Auth UID.
 * If that profile does not exist, it uses the authenticated
 * Firebase phone number to find the existing users document.
 *
 * Supported profile phone fields:
 *   - phoneNumber
 *   - mobile
 *   - mobileNumber
 *
 * It also supports values stored as:
 *   9876543210
 *   +919876543210
 *   +91 9876543210
 */
async function resolveOnlineWalaaUser(request) {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "कृपया प्रथम लॉगिन करा."
    );
  }

  const authUid = request.auth.uid;

  // ---------------------------------------------------------
  // 1. FIRST: Try the current Firebase Auth UID
  // ---------------------------------------------------------
  const directRef = db
    .collection("users")
    .doc(authUid);

  const directSnap = await directRef.get();

  if (directSnap.exists) {
    return {
      ref: directRef,
      snap: directSnap,
      userId: directRef.id,
      matchedBy: "uid",
    };
  }

  // ---------------------------------------------------------
  // 2. GET VERIFIED PHONE NUMBER FROM FIREBASE AUTH
  // ---------------------------------------------------------
  const authPhone = String(
    request.auth.token?.phone_number || ""
  ).trim();

  const normalizedPhone = authPhone.replace(/\D/g, "");

  if (!normalizedPhone) {
    throw new HttpsError(
      "not-found",
      "User profile सापडला नाही. Firebase account मध्ये mobile number उपलब्ध नाही."
    );
  }

  // Indian 10-digit number from +91XXXXXXXXXX
  const tenDigitPhone =
    normalizedPhone.length >= 10
      ? normalizedPhone.slice(-10)
      : normalizedPhone;

  if (!/^[6-9]\d{9}$/.test(tenDigitPhone)) {
    throw new HttpsError(
      "not-found",
      "User profile सापडला नाही. Login mobile number valid नाही."
    );
  }

  const phoneVariants = [
    tenDigitPhone,
    `+91${tenDigitPhone}`,
    `+91 ${tenDigitPhone}`,
  ];

  // ---------------------------------------------------------
  // 3. SEARCH EXISTING PROFILE BY PHONE
  // ---------------------------------------------------------
  const phoneFields = [
    "phoneNumber",
    "mobile",
    "mobileNumber",
  ];

  for (const field of phoneFields) {
    for (const phoneValue of phoneVariants) {
      const querySnap = await db
        .collection("users")
        .where(field, "==", phoneValue)
        .limit(2)
        .get();

      if (querySnap.empty) {
        continue;
      }

      if (querySnap.size > 1) {
        console.error(
          "Multiple user profiles found for phone:",
          field,
          phoneValue
        );

        throw new HttpsError(
          "failed-precondition",
          "या mobile number वर एकापेक्षा जास्त user profiles सापडले. कृपया admin कडून profile तपासा."
        );
      }

      const profileDoc = querySnap.docs[0];

      return {
        ref: profileDoc.ref,
        snap: profileDoc,
        userId: profileDoc.id,
        matchedBy: `${field}:${phoneValue}`,
      };
    }
  }

  // ---------------------------------------------------------
  // 4. NO PROFILE FOUND
  // ---------------------------------------------------------
  console.error(
    "OnlineWalaa profile lookup failed.",
    {
      authUid,
      phoneFieldAvailable: Boolean(authPhone),
      phoneLast4: tenDigitPhone.slice(-4),
    }
  );

  throw new HttpsError(
    "not-found",
    "User profile सापडला नाही."
  );
}

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

      /* -----------------------------------------------------
         2. RESOLVE USER PROFILE

         Normal login:
           Firebase Auth UID == users document ID

         OTP login:
           Firebase Auth UID may be different.
           In that case find the existing users document
           using the verified Firebase phone number.
      ----------------------------------------------------- */

      let resolvedUser;

      try {
        resolvedUser =
          await resolveOnlineWalaaUser(request);
      } catch (error) {
        console.error(
          "OnlineWalaa user profile resolution error:",
          error
        );

        if (error instanceof HttpsError) {
          throw error;
        }

        throw new HttpsError(
          "internal",
          "User profile शोधताना काहीतरी चूक झाली."
        );
      }

      const userRef =
        resolvedUser.ref;

      // IMPORTANT:
      // From this point onward, use the actual Firestore
      // profile document ID, NOT request.auth.uid.
      const userId =
        resolvedUser.userId;

      /* -----------------------------------------------------
         3. AMOUNT VALIDATION
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
         4. OPTIONAL MAX PAYMENT LIMIT
      ----------------------------------------------------- */

      const MAX_PAYMENT = 50000;

      if (amount > MAX_PAYMENT) {
        throw new HttpsError(
          "invalid-argument",
          `एका पेमेंटची कमाल मर्यादा ₹${MAX_PAYMENT} आहे.`
        );
      }

      /* -----------------------------------------------------
         5. REFERENCES
      ----------------------------------------------------- */

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
         6. ATOMIC FIRESTORE TRANSACTION
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
                userSnap.data() || {};

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

                  // Keep Firebase Auth UID also for tracing.
                  authUid:
                    request.auth.uid,

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

                  // Keep Firebase Auth UID also for tracing.
                  authUid:
                    request.auth.uid,

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

                userId:
                  userId,

                authUid:
                  request.auth.uid,

                matchedBy:
                  resolvedUser.matchedBy,

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
         7. SUCCESS RESPONSE
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
    timeoutSeconds: 120,
    memory: "256MiB",
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
        throw new HttpsError(
          "unauthenticated",
          "कृपया आधी Login करा."
        );
      }

      const resolvedUser =
        await resolveOnlineWalaaUser(request);

      const userId = resolvedUser.userId;

      console.log("Authenticated user:", userId);

      // ========================================
      // STEP 2: VALIDATE AADHAAR
      // ========================================

      const aadhaarNumber = String(
        request.data?.aadhaarNumber || ""
      ).replace(/\D/g, "");

      console.log("Aadhaar received:", !!aadhaarNumber);
      console.log("Aadhaar length:", aadhaarNumber.length);

      if (!/^\d{12}$/.test(aadhaarNumber)) {
        throw new HttpsError(
          "invalid-argument",
          "कृपया 12 अंकों का valid Aadhaar Number दर्ज करें."
        );
      }

      // ========================================
      // STEP 3: SERVICE AMOUNT
      // ========================================

      const SERVICE_AMOUNT = 50;

      console.log(`Service amount: ₹${SERVICE_AMOUNT}`);

      // ========================================
      // STEP 4: CHECK WALLET BALANCE
      // ========================================

      const userRef = db
        .collection("users")
        .doc(userId);

      const userSnap = await userRef.get();

      if (!userSnap.exists) {
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

      if (
        !Number.isFinite(currentAvailableBalance) ||
        currentAvailableBalance < SERVICE_AMOUNT
      ) {
        throw new HttpsError(
          "failed-precondition",
          `Wallet balance insufficient. कम से कम ₹${SERVICE_AMOUNT} होना चाहिए.`
        );
      }

      console.log("✅ Wallet balance sufficient.");

      // ========================================
      // STEP 5: PARIPRINT API CONFIGURATION
      // ========================================

      const apiKey = PARIPRINT_API_KEY.value();

      if (!apiKey) {
        throw new HttpsError(
          "failed-precondition",
          "Pariprint API configuration missing है."
        );
      }

      const endpoint =
        "https://pariprint.in/api-proxy.php";

      console.log("Pariprint API key configured.");

      // ========================================
      // STEP 6: PAN VALIDATION
      // ========================================

      const isValidPan = (pan) => {
        return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(
          String(pan || "")
            .trim()
            .toUpperCase()
        );
      };

      // ========================================
      // STEP 7: NORMALIZE PARIPRINT RESPONSE
      // ========================================

      const normalizeResponse = (data) => {

        const panNumber = String(
          data?.pan_no ||
          data?.full_pan_number ||
          data?.pan_number ||
          data?.pan ||
          ""
        )
          .trim()
          .toUpperCase();

        const status = String(
          data?.status ?? ""
        )
          .trim()
          .toLowerCase();

        const statusSuccess =
          status === "200" ||
          status === "true" ||
          status === "success";

        const panValid = isValidPan(panNumber);

        return {
          success:
            statusSuccess &&
            panValid,

          panNumber,

          status: data?.status ?? null,

          message:
            data?.message || "",

          requestId:
            data?.request_id ||
            data?.requestId ||
            null,

          orderId:
            data?.order_id ||
            data?.orderId ||
            null,

          aadhaarStatus:
            data?.aadhaar_status || null,

          panFindStatus:
            data?.aadhaar_to_panfind_status || null,

          downloadUrl:
            data?.download_url || null,
        };
      };

      // ========================================
      // STEP 8: PARIPRINT API REQUEST
      // API: aadhaar-to-pan
      // METHOD: GET
      // PARAMETER: aadhaar_no
      // ========================================

      const callPanProvider = async () => {

        console.log("----------------------------------------");
        console.log("Calling Pariprint Aadhaar to PAN API");

        const url = new URL(endpoint);

        url.searchParams.set(
          "slug",
          "aadhaar-to-pan"
        );

        url.searchParams.set(
          "aadhaar_no",
          aadhaarNumber
        );

        url.searchParams.set(
          "api_key",
          apiKey
        );

        try {

          const response = await fetch(
            url.toString(),
            {
              method: "GET",
              headers: {
                Accept: "application/json",
              },
            }
          );

          console.log(
            "Pariprint HTTP status:",
            response.status
          );

          const rawResponse = await response.text();

          let data;

          try {
            data = JSON.parse(rawResponse);
          } catch (jsonError) {

            console.error(
              "Pariprint returned invalid JSON."
            );

            return {
              success: false,
              data: null,
              normalized: null,
            };
          }

          const normalized =
            normalizeResponse(data);

          console.log(
            "API status:",
            normalized.status
          );

          console.log(
            "API message:",
            normalized.message
          );

          console.log(
            "PAN received:",
            normalized.panNumber ? "YES" : "NO"
          );

          console.log(
            "PAN format valid:",
            isValidPan(normalized.panNumber)
          );

          console.log(
            "Request ID received:",
            !!normalized.requestId
          );

          console.log(
            "Order ID received:",
            !!normalized.orderId
          );

          return {
            success:
              response.ok &&
              normalized.success,

            data,
            normalized,
          };

        } catch (error) {

          console.error(
            "Pariprint API request failed:",
            error?.message
          );

          return {
            success: false,
            data: null,
            normalized: null,
          };
        }
      };

      // ========================================
      // STEP 9: EXECUTE PAN FIND
      // ========================================

      console.log("========================================");
      console.log("STEP 9: CALLING PARIPRINT API");
      console.log("========================================");

      const providerResult =
        await callPanProvider();

      if (!providerResult.success) {

        console.error(
          "❌ PARIPRINT PAN LOOKUP FAILED."
        );

        throw new HttpsError(
          "failed-precondition",
          providerResult.normalized?.message ||
          "PAN details could not be fetched. No wallet amount has been deducted. Please try again later."
        );
      }

      const apiData = providerResult.data;

      const normalizedResult =
        providerResult.normalized;

      const panNumber =
        normalizedResult.panNumber;

      const providerUsed = "aadhaar-to-pan";

      console.log("========================================");
      console.log("🎉 PAN LOOKUP SUCCESSFUL");
      console.log("Provider:", providerUsed);
      console.log("PAN received: YES");
      console.log("========================================");

      // ========================================
      // STEP 10: FINAL PAN VALIDATION
      // ========================================

      if (!isValidPan(panNumber)) {
        throw new HttpsError(
          "failed-precondition",
          "Invalid PAN response received."
        );
      }

      // ========================================
      // STEP 11: WALLET DEBIT
      // ONLY AFTER SUCCESSFUL PAN LOOKUP
      // ========================================

      console.log(
        "STEP 11: Starting wallet debit..."
      );

      const walletTransactionRef = db
        .collection("walletTransactions")
        .doc();

      const panRequestRef = db
        .collection("panFindRequests")
        .doc();

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

            const freshWalletBalance = Number(
              freshUserData.walletBalance || 0
            );

            const freshAvailableBalance = Number(
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
              !Number.isFinite(freshAvailableBalance) ||
              freshAvailableBalance < SERVICE_AMOUNT
            ) {
              throw new HttpsError(
                "failed-precondition",
                `Wallet balance insufficient. कम से कम ₹${SERVICE_AMOUNT} होना चाहिए.`
              );
            }

            const newWalletBalance =
              freshWalletBalance - SERVICE_AMOUNT;

            const newAvailableBalance =
              freshAvailableBalance - SERVICE_AMOUNT;

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
            // CREATE WALLET TRANSACTION
            // --------------------------------

            transaction.set(
              walletTransactionRef,
              {
                userId: userId,

                amount: SERVICE_AMOUNT,

                type: "SERVICE_PAYMENT",

                direction: "DEBIT",

                status: "success",

                service: "INSTANT_PAN_FIND",

                description: "Instant PAN Find",

                provider: "pariprint",

                providerService: providerUsed,

                referenceId: panRequestRef.id,

                createdAt:
                  admin.firestore.FieldValue
                    .serverTimestamp(),
              }
            );

            // --------------------------------
            // CREATE PAN FIND REQUEST
            // --------------------------------

            transaction.set(
              panRequestRef,
              {
                userId: userId,

                service: "INSTANT_PAN_FIND",

                status: "success",

                amount: SERVICE_AMOUNT,

                panNumber: panNumber,

                provider: "pariprint",

                providerService: providerUsed,

                walletTransactionId:
                  walletTransactionRef.id,

                // PARIPRINT DETAILS

                requestId:
                  normalizedResult.requestId,

                orderId:
                  normalizedResult.orderId,

                downloadUrl:
                  normalizedResult.downloadUrl,

                aadhaarStatus:
                  normalizedResult.aadhaarStatus,

                providerStatus:
                  normalizedResult.status,

                providerPanFindStatus:
                  normalizedResult.panFindStatus,

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

      console.log("✅ Wallet debit successful.");

      console.log(
        `Debited ₹${SERVICE_AMOUNT}`
      );

      console.log(
        "Remaining wallet balance:",
        transactionResult.newWalletBalance
      );

      // ========================================
      // STEP 12: SUCCESS RESPONSE
      // COMPATIBLE WITH EXISTING REACT COMPONENT
      // ========================================

      console.log("========================================");
      console.log("🎉 instantPanFind SUCCESS");
      console.log("Provider:", providerUsed);

      console.log(
        "Transaction ID:",
        walletTransactionRef.id
      );

      console.log(
        "PAN Request ID:",
        panRequestRef.id
      );

      console.log("========================================");

      return {
        success: true,

        message:
          normalizedResult.message ||
          "Aadhaar to PAN find successful.",

        panNumber: panNumber,

        amount: SERVICE_AMOUNT,

        transactionId:
          walletTransactionRef.id,

        requestId:
          panRequestRef.id,

        providerRequestId:
          normalizedResult.requestId,

        orderId:
          normalizedResult.orderId,

        downloadUrl:
          normalizedResult.downloadUrl,

        remainingBalance:
          transactionResult.newWalletBalance,
      };

    } catch (error) {

      // ========================================
      // STEP 13: ERROR HANDLING
      // ========================================

      console.error("========================================");
      console.error("❌ instantPanFind ERROR");
      console.error("Error code:", error?.code);
      console.error("Error message:", error?.message);
      console.error("========================================");

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

    const resolvedUser =
      await resolveOnlineWalaaUser(request);

    const userId = resolvedUser.userId;

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
    const resolvedUser =
      await resolveOnlineWalaaUser(request);

    const uid = resolvedUser.userId;

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
    const resolvedUser =
      await resolveOnlineWalaaUser(request);

    const uid = resolvedUser.userId;

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

    const resolvedUser =
      await resolveOnlineWalaaUser(request);

    const uid = resolvedUser.userId;

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

    const resolvedUser =
      await resolveOnlineWalaaUser(request);

    const uid =
      resolvedUser.userId;

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

    const resolvedUser =
      await resolveOnlineWalaaUser(request);

    const uid = resolvedUser.userId;

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

    const resolvedUser =
      await resolveOnlineWalaaUser(request);

    const uid = resolvedUser.userId;

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

    const resolvedUser =
      await resolveOnlineWalaaUser(request);

    const uid =
      resolvedUser.userId;

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

// ============================================================
// AADHAAR TO RATION PDF
// ============================================================

exports.aadharToRationPdf = onCall(
  {
    region: "asia-south1",
    invoker: "public",
    secrets: [PARIPRINT_API_KEY],
    timeoutSeconds: 120,
    memory: "256MiB",
  },

  async (request) => {

    // ========================================================
    // 1. AUTH CHECK
    // ========================================================

    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "कृपया आधी Login करा."
      );
    }


    // ========================================================
    // 2. RESOLVE ONLINEWALAA USER
    // ========================================================

    const resolvedUser =
      await resolveOnlineWalaaUser(
        request
      );

    const uid =
      resolvedUser.userId;


    if (!uid) {
      throw new HttpsError(
        "unauthenticated",
        "User account सापडले नाही."
      );
    }


    // ========================================================
    // 3. INPUT
    // ========================================================

    const uidNumber =
      String(
        request.data?.uidNumber ||
        ""
      )
        .trim()
        .replace(/\D/g, "");


    const type =
      String(
        request.data?.type ||
        "Default"
      ).trim();


    // ========================================================
    // 4. VALIDATE AADHAAR
    // ========================================================

    if (!uidNumber) {
      throw new HttpsError(
        "invalid-argument",
        "कृपया Aadhaar Number टाका."
      );
    }


    if (
      !/^\d{12}$/.test(
        uidNumber
      )
    ) {
      throw new HttpsError(
        "invalid-argument",
        "कृपया Valid 12 digit Aadhaar Number टाका."
      );
    }


    // ========================================================
    // 5. SERVICE CHARGE
    //
    // Provider response मध्ये service_price = 5 आहे.
    // ========================================================

    const SERVICE_CHARGE = 50;


    // ========================================================
    // 6. USER REFERENCE
    // ========================================================

    const userRef =
      db
        .collection("users")
        .doc(uid);


    // ========================================================
    // 7. INITIAL WALLET CHECK
    // ========================================================

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


    const initialWalletBalance =
      Number(
        userData.walletBalance ??
        0
      );


    const initialAvailableBalance =
      Number(
        userData.availableBalance ??
        initialWalletBalance
      );


    if (
      !Number.isFinite(
        initialWalletBalance
      ) ||
      !Number.isFinite(
        initialAvailableBalance
      )
    ) {
      throw new HttpsError(
        "failed-precondition",
        "Wallet balance invalid आहे."
      );
    }


    if (
      initialAvailableBalance <
      SERVICE_CHARGE
    ) {
      throw new HttpsError(
        "failed-precondition",
        `Wallet मध्ये किमान ₹${SERVICE_CHARGE} उपलब्ध असणे आवश्यक आहे.`
      );
    }


    // ========================================================
    // 8. PARIPRINT API KEY
    // ========================================================

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


    // ========================================================
    // 9. PARIPRINT API URL
    //
    // Example:
    //
    // slug=aadhar-to-ration-pdf
    // uidNumber=123456789012
    // type=Default
    // api_key=SECRET
    // ========================================================

    const apiUrl =
      "https://pariprint.in/api-proxy.php" +
      "?slug=aadhar-to-ration-pdf" +
      "&uidNumber=" +
      encodeURIComponent(
        uidNumber
      ) +
      "&type=" +
      encodeURIComponent(
        type
      ) +
      "&api_key=" +
      encodeURIComponent(
        apiKey
      );


    console.log(
      "=========================================="
    );

    console.log(
      "AADHAAR TO RATION PDF REQUEST"
    );

    console.log(
      "User:",
      uid
    );

    console.log(
      "Aadhaar:",
      `${uidNumber.substring(
        0,
        4
      )}********`
    );

    console.log(
      "Type:",
      type
    );

    console.log(
      "=========================================="
    );


    // ========================================================
    // 10. PROVIDER REQUEST
    // ========================================================

    let providerResponse;

    try {

      const response =
        await fetch(
          apiUrl,
          {
            method: "GET",

            headers: {
              Accept:
                "application/json",

              "User-Agent":
                "OnlineWalaa/1.0",
            },
          }
        );


      const rawText =
        await response.text();


      console.log(
        "Aadhaar Ration HTTP:",
        response.status
      );


      console.log(
        "Aadhaar Ration Response:",
        rawText.substring(
          0,
          1500
        )
      );


      try {

        providerResponse =
          JSON.parse(
            rawText
          );

      } catch (
        parseError
      ) {

        console.error(
          "Provider JSON parse error:",
          parseError
        );

        throw new HttpsError(
          "internal",
          "Provider कडून invalid response मिळाला."
        );
      }

    } catch (error) {

      console.error(
        "Aadhaar Ration provider error:",
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
        "Aadhaar to Ration service उपलब्ध नाही."
      );
    }


    // ========================================================
    // 11. EXTRACT PDF
    // ========================================================

    const pdfBase64 =
      String(
        providerResponse?.data?.pdf ||
        providerResponse?.pdf ||
        ""
      ).trim();


    // ========================================================
    // 12. PROVIDER SUCCESS
    // ========================================================

    const providerStatus =
      providerResponse?.status;


    const providerSuccess =
      providerStatus ===
        "success" ||

      providerStatus ===
        "SUCCESS" ||

      providerStatus ===
        true;


    console.log(
      "Provider Status:",
      providerStatus
    );


    console.log(
      "Provider Message:",
      providerResponse?.message
    );


    console.log(
      "Has PDF:",
      Boolean(
        pdfBase64
      )
    );


    if (
      !providerSuccess ||
      !pdfBase64
    ) {

      console.error(
        "Aadhaar Ration PDF generation failed:",
        providerResponse
      );


      throw new HttpsError(
        "failed-precondition",
        providerResponse?.message ||
          "Aadhaar to Ration PDF तयार होऊ शकला नाही."
      );
    }


    // ========================================================
    // 13. CLEAN BASE64
    // ========================================================

    const cleanPdfBase64 =
      pdfBase64
        .replace(
          /^data:application\/pdf;base64,/i,
          ""
        )
        .replace(
          /\s/g,
          ""
        );


    if (
      !cleanPdfBase64
    ) {
      throw new HttpsError(
        "failed-precondition",
        "PDF data रिकामा आहे."
      );
    }


    // ========================================================
    // 14. VERIFY PDF
    // ========================================================

    let pdfBuffer;

    try {

      pdfBuffer =
        Buffer.from(
          cleanPdfBase64,
          "base64"
        );

    } catch (
      error
    ) {

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
      pdfBuffer.length <
        100 ||

      pdfBuffer
        .subarray(
          0,
          4
        )
        .toString() !==
        "%PDF"
    ) {

      throw new HttpsError(
        "failed-precondition",
        "Provider कडून valid PDF मिळाला नाही."
      );
    }


    // ========================================================
    // 15. TRANSACTION REFERENCES
    // ========================================================

    const walletTransactionRef =
      db
        .collection(
          "walletTransactions"
        )
        .doc();


    const requestRef =
      db
        .collection(
          "aadharToRationPdfRequests"
        )
        .doc();


    const transactionId =
      walletTransactionRef.id;


    const requestId =
      requestRef.id;


    let remainingWalletBalance = 0;

    let remainingAvailableBalance = 0;


    // ========================================================
    // 16. ATOMIC WALLET DEBIT
    // ========================================================

    try {

      await db.runTransaction(
        async (
          transaction
        ) => {

          const freshUserSnap =
            await transaction.get(
              userRef
            );


          if (
            !freshUserSnap.exists
          ) {

            throw new HttpsError(
              "not-found",
              "User account सापडले नाही."
            );
          }


          const freshUserData =
            freshUserSnap.data() ||
            {};


          const walletBalance =
            Number(
              freshUserData.walletBalance ??
              0
            );


          const availableBalance =
            Number(
              freshUserData.availableBalance ??
              walletBalance
            );


          if (
            !Number.isFinite(
              walletBalance
            ) ||
            !Number.isFinite(
              availableBalance
            )
          ) {

            throw new HttpsError(
              "failed-precondition",
              "Wallet balance invalid आहे."
            );
          }


          // IMPORTANT:
          // Service payment available balance
          // मधून होईल.

          if (
            availableBalance <
            SERVICE_CHARGE
          ) {

            throw new HttpsError(
              "failed-precondition",
              `Wallet मध्ये ₹${SERVICE_CHARGE} उपलब्ध नाहीत.`
            );
          }


          // ----------------------------------------------------
          // NEW BALANCES
          // ----------------------------------------------------

          remainingWalletBalance =
            Math.max(
              0,
              Number(
                (
                  walletBalance -
                  SERVICE_CHARGE
                ).toFixed(2)
              )
            );


          remainingAvailableBalance =
            Math.max(
              0,
              Number(
                (
                  availableBalance -
                  SERVICE_CHARGE
                ).toFixed(2)
              )
            );


          // ----------------------------------------------------
          // UPDATE USER
          // ----------------------------------------------------

          transaction.update(
            userRef,
            {
              walletBalance:
                remainingWalletBalance,

              availableBalance:
                remainingAvailableBalance,

              updatedAt:
                admin.firestore
                  .FieldValue
                  .serverTimestamp(),
            }
          );


          // ----------------------------------------------------
          // WALLET TRANSACTION
          // ----------------------------------------------------

          transaction.set(
            walletTransactionRef,
            {
              uid,

              userId:
                uid,

              type:
                "DEBIT",

              direction:
                "DEBIT",

              service:
                "AADHAAR_TO_RATION_PDF",

              serviceName:
                "Aadhaar To Ration PDF",

              amount:
                SERVICE_CHARGE,

              provider:
                "PARIPRINT",

              uidNumber,

              documentType:
                type,

              providerMessage:
                providerResponse?.message ||
                null,

              providerServicePrice:
                Number(
                  providerResponse?.service_price ??
                  SERVICE_CHARGE
                ),

              balanceBefore:
                walletBalance,

              balanceAfter:
                remainingWalletBalance,

              availableBalanceBefore:
                availableBalance,

              availableBalanceAfter:
                remainingAvailableBalance,

              status:
                "SUCCESS",

              createdAt:
                admin.firestore
                  .FieldValue
                  .serverTimestamp(),
            }
          );


          // ----------------------------------------------------
          // SERVICE REQUEST HISTORY
          // ----------------------------------------------------

          transaction.set(
            requestRef,
            {
              uid,

              userId:
                uid,

              uidNumber,

              type,

              name:
                providerResponse?.data?.name ||
                null,

              ration:
                providerResponse?.data?.ration ||
                null,

              amount:
                SERVICE_CHARGE,

              provider:
                "PARIPRINT",

              providerService:
                "aadhar_to_ration_pdf",

              providerServicePrice:
                Number(
                  providerResponse?.service_price ??
                  SERVICE_CHARGE
                ),

              providerMessage:
                providerResponse?.message ||
                null,

              transactionId,

              status:
                "SUCCESS",

              createdAt:
                admin.firestore
                  .FieldValue
                  .serverTimestamp(),
            }
          );
        }
      );

    } catch (
      error
    ) {

      console.error(
        "Aadhaar Ration wallet transaction error:",
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
        "Wallet debit करण्यात समस्या आली."
      );
    }


    // ========================================================
    // 17. SUCCESS RESPONSE
    // ========================================================

    console.log(
      "=========================================="
    );

    console.log(
      "AADHAAR TO RATION PDF SUCCESS"
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
      "Remaining Wallet:",
      remainingWalletBalance
    );

    console.log(
      "Remaining Available:",
      remainingAvailableBalance
    );

    console.log(
      "=========================================="
    );


    return {

      success:
        true,

      message:
        providerResponse?.message ||
        "Aadhaar to Ration PDF तयार आहे.",

      uidNumber,

      type,

      name:
        providerResponse?.data?.name ||
        null,

      ration:
        providerResponse?.data?.ration ||
        null,

      pdf:
        cleanPdfBase64,

      filename:
        providerResponse?.filename ||
        `Aadhar_To_Ration_${uidNumber}.pdf`,

      amount:
        SERVICE_CHARGE,

      providerServicePrice:
        Number(
          providerResponse?.service_price ??
          SERVICE_CHARGE
        ),

      transactionId,

      requestId,

      remainingBalance:
        remainingWalletBalance,

      remainingWalletBalance,

      remainingAvailableBalance,
    };
  }
);


// ============================================================
// ONLINEWALAA - WHATSAPP APPLICATION NOTIFICATION
// Admin creates an application for a customer; send the approved
// WhatsApp template to that customer's opted-in mobile number.
// ============================================================

exports.sendApplicationWhatsApp = onCall(
  {
    region: "asia-south1",
    invoker: "public",
    secrets: [
      WHATSAPP_ACCESS_TOKEN,
      WHATSAPP_PHONE_NUMBER_ID,
    ],
  },
  async (request) => {
    // Use the same admin authorization policy as the existing functions.
    checkAdmin(request);

    const userId = String(request.data?.userId || "").trim();
    const applicationName = String(
      request.data?.applicationName || ""
    ).trim();
    const applicationStatus = String(
      request.data?.applicationStatus || ""
    ).trim();

    if (!userId || !applicationName || !applicationStatus) {
      throw new HttpsError(
        "invalid-argument",
        "userId, applicationName and applicationStatus are required."
      );
    }

    const customerRef = db.collection("users").doc(userId);
    const customerSnap = await customerRef.get();

    if (!customerSnap.exists) {
      throw new HttpsError("not-found", "Customer profile not found.");
    }

    const customer = customerSnap.data() || {};

    // Require explicit WhatsApp consent stored on the customer profile.
    if (customer.whatsappOptIn !== true) {
      throw new HttpsError(
        "failed-precondition",
        "Customer has not opted in to WhatsApp messages."
      );
    }

    let mobile = String(
      customer.mobile || customer.phoneNumber || customer.mobileNumber || ""
    ).replace(/\D/g, "");

    if (mobile.length === 10) {
      mobile = `91${mobile}`;
    } else if (mobile.length === 12 && mobile.startsWith("91")) {
      // Already in international format without the plus sign.
    } else {
      throw new HttpsError(
        "invalid-argument",
        "Customer mobile number must be a valid Indian 10-digit number."
      );
    }

    const logRef = db.collection("whatsappLogs").doc();

    await logRef.set({
      userId,
      mobile,
      applicationName,
      status: "sending",
      templateName: "onlinewalaa_application_confirmation",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    try {
      const apiResponse = await fetch(
        `https://graph.facebook.com/v25.0/${WHATSAPP_PHONE_NUMBER_ID.value()}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN.value()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: mobile,
            type: "template",
            template: {
              name: "onlinewalaa_application_confirmation",
              language: { code: "en" },
              components: [
                {
                  type: "body",
                  parameters: [
                    {
                      type: "text",
                      text: String(customer.name || "Customer"),
                    },
                    { type: "text", text: applicationName },
                    { type: "text", text: applicationStatus },
                  ],
                },
              ],
            },
          }),
        }
      );

      const result = await apiResponse.json();

      if (!apiResponse.ok) {
        const apiMessage =
          result?.error?.message || "WhatsApp API request failed.";
        await logRef.update({
          status: "failed",
          error: apiMessage,
          metaErrorCode: result?.error?.code || null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.error("WhatsApp API error:", {
          status: apiResponse.status,
          code: result?.error?.code,
          message: apiMessage,
        });

        return {
          success: false,
          message: "Application saved, but WhatsApp message could not be sent.",
        };
      }

      const messageId = result?.messages?.[0]?.id || null;

      await logRef.update({
        status: "accepted",
        messageId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        messageId,
        message: "WhatsApp message accepted by Meta.",
      };
    } catch (error) {
      console.error("WhatsApp send failed:", error);

      await logRef.update({
        status: "failed",
        error: error?.message || "Unknown WhatsApp sending error.",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        success: false,
        message: "Application saved, but WhatsApp sending failed.",
      };
    }
  }
);


// ============================================================
// ONLINEWALAA - SEND INVOICE + SELECTED APPLICATION PDFS
// Requires the approved Marathi Utility template:
// onlinewalaa_application_invoice_documents
// Header: Document | Body variables: customer, application,
// subtotal, discount, final amount.
// ============================================================

exports.sendApplicationWhatsAppDocuments = onCall(
  {
    region: "asia-south1",
    invoker: "public",
    timeoutSeconds: 540,
    memory: "1GiB",
    secrets: [WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID],
  },
  async (request) => {
    checkAdmin(request);

    const userId = String(request.data?.userId || "").trim();
    const applicationName = String(request.data?.applicationName || "").trim();
    const invoiceStoragePath = String(request.data?.invoiceStoragePath || "").trim();
    const documentStoragePaths = Array.isArray(request.data?.documentStoragePaths)
      ? request.data.documentStoragePaths.map((path) => String(path || "").trim()).filter(Boolean)
      : [];

    const subtotal = Number(request.data?.subtotal);
    const discountAmount = Number(request.data?.discountAmount);
    const total = Number(request.data?.total);

    if (
      !userId ||
      !applicationName ||
      !invoiceStoragePath ||
      !Number.isFinite(subtotal) ||
      !Number.isFinite(discountAmount) ||
      !Number.isFinite(total) ||
      subtotal < 0 ||
      discountAmount < 0 ||
      total < 0
    ) {
      throw new HttpsError("invalid-argument", "Application, invoice and valid amount details are required.");
    }

    if (documentStoragePaths.length > 15) {
      throw new HttpsError("invalid-argument", "A maximum of 15 additional PDF documents can be sent at once.");
    }

    const customerSnap = await db.collection("users").doc(userId).get();
    if (!customerSnap.exists) {
      throw new HttpsError("not-found", "Customer profile not found.");
    }

    const customer = customerSnap.data() || {};
    if (customer.whatsappOptIn !== true) {
      throw new HttpsError("failed-precondition", "Customer has not opted in to WhatsApp messages.");
    }

    let mobile = String(
      customer.mobile || customer.phoneNumber || customer.mobileNumber || ""
    ).replace(/\D/g, "");

    if (mobile.length === 10) {
      mobile = `91${mobile}`;
    } else if (!(mobile.length === 12 && mobile.startsWith("91"))) {
      throw new HttpsError("invalid-argument", "Customer mobile number must be a valid Indian 10-digit number.");
    }

    const isAllowedStoragePath = (storagePath, kind) => {
      if (!storagePath || storagePath.startsWith("/") || storagePath.includes("..")) return false;
      if (kind === "invoice") {
        return storagePath.startsWith(`application-invoices/${userId}/`);
      }
      return (
        storagePath.startsWith("application-documents/categories/") ||
        storagePath.startsWith(`application-documents/custom/${userId}/`)
      );
    };

    if (!isAllowedStoragePath(invoiceStoragePath, "invoice")) {
      throw new HttpsError("permission-denied", "Invoice file path is not allowed.");
    }

    const uniqueDocumentPaths = [...new Set(documentStoragePaths)];
    for (const storagePath of uniqueDocumentPaths) {
      if (!isAllowedStoragePath(storagePath, "document")) {
        throw new HttpsError("permission-denied", "One or more PDF document paths are not allowed.");
      }
    }

    const filesToSend = [
      { storagePath: invoiceStoragePath, kind: "invoice" },
      ...uniqueDocumentPaths.map((storagePath) => ({ storagePath, kind: "attachment" })),
    ];

    const templateName = "onlinewalaa_application_invoice_documents";
    const bucket = admin.storage().bucket();
    const token = WHATSAPP_ACCESS_TOKEN.value();
    const phoneNumberId = WHATSAPP_PHONE_NUMBER_ID.value();
    const batchLogRef = db.collection("whatsappLogs").doc();

    await batchLogRef.set({
      userId,
      mobile,
      applicationName,
      templateName,
      type: "application_invoice_documents",
      documentCount: filesToSend.length,
      subtotal,
      discountAmount,
      total,
      status: "sending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const formatRupees = (value) => `₹${value.toFixed(2)}`;
    const bodyParameters = [
      { type: "text", text: String(customer.name || "Customer").slice(0, 100) },
      { type: "text", text: applicationName.slice(0, 200) },
      { type: "text", text: formatRupees(subtotal) },
      { type: "text", text: formatRupees(discountAmount) },
      { type: "text", text: formatRupees(total) },
    ];

    const results = [];

    for (const fileInfo of filesToSend) {
      const fileLogRef = db.collection("whatsappLogs").doc();

      try {
        const storageFile = bucket.file(fileInfo.storagePath);
        const [metadata] = await storageFile.getMetadata();
        const size = Number(metadata.size || 0);

        if (size <= 0 || size > 100 * 1024 * 1024) {
          throw new Error("PDF is empty or exceeds WhatsApp's 100 MB document limit.");
        }

        const [fileBuffer] = await storageFile.download();
        if (fileBuffer.subarray(0, 5).toString() !== "%PDF-") {
          throw new Error("The selected file is not a valid PDF.");
        }

        const filename = fileInfo.storagePath.split("/").pop().replace(/[^\w.\- ]/g, "_").slice(0, 120);
        const formData = new FormData();
        formData.append("messaging_product", "whatsapp");
        formData.append("type", "application/pdf");
        formData.append("file", new Blob([fileBuffer], { type: "application/pdf" }), filename);

        const mediaResponse = await fetch(
          `https://graph.facebook.com/v25.0/${phoneNumberId}/media`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          }
        );

        const mediaResult = await mediaResponse.json();
        if (!mediaResponse.ok || !mediaResult?.id) {
          throw new Error(mediaResult?.error?.message || "WhatsApp media upload failed.");
        }

        const sendResponse = await fetch(
          `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: mobile,
              type: "template",
              template: {
                name: templateName,
                language: { code: "mr" },
                components: [
                  {
                    type: "header",
                    parameters: [
                      {
                        type: "document",
                        document: {
                          id: mediaResult.id,
                          filename,
                        },
                      },
                    ],
                  },
                  {
                    type: "body",
                    parameters: bodyParameters,
                  },
                ],
              },
            }),
          }
        );

        const sendResult = await sendResponse.json();
        if (!sendResponse.ok || !sendResult?.messages?.[0]?.id) {
          throw new Error(sendResult?.error?.message || "WhatsApp document template send failed.");
        }

        const messageId = sendResult.messages[0].id;
        await fileLogRef.set({
          batchId: batchLogRef.id,
          userId,
          mobile,
          applicationName,
          templateName,
          storagePath: fileInfo.storagePath,
          filename,
          documentKind: fileInfo.kind,
          messageId,
          status: "accepted",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        results.push({
          filename,
          kind: fileInfo.kind,
          messageId,
          status: "accepted",
        });
      } catch (error) {
        console.error("WhatsApp PDF send failed:", {
          storagePath: fileInfo.storagePath,
          message: error?.message,
        });

        await fileLogRef.set({
          batchId: batchLogRef.id,
          userId,
          mobile,
          applicationName,
          templateName,
          storagePath: fileInfo.storagePath,
          documentKind: fileInfo.kind,
          status: "failed",
          error: error?.message || "Unknown PDF delivery error.",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        results.push({
          filename: fileInfo.storagePath.split("/").pop(),
          kind: fileInfo.kind,
          status: "failed",
          error: error?.message || "Unknown PDF delivery error.",
        });
      }
    }

    const acceptedCount = results.filter((item) => item.status === "accepted").length;
    const failedCount = results.length - acceptedCount;

    await batchLogRef.update({
      status: failedCount === 0 ? "accepted" : acceptedCount > 0 ? "partial" : "failed",
      acceptedCount,
      failedCount,
      results,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: acceptedCount > 0,
      batchId: batchLogRef.id,
      acceptedCount,
      failedCount,
      results,
      message: `${acceptedCount} of ${results.length} PDF message(s) accepted by WhatsApp.`,
    };
  }
);

// ============================================================
// ONLINEWALAA - WHATSAPP DELIVERY STATUS WEBHOOK
// Meta calls GET to verify the callback URL and POST to send
// message status updates. Updates matching whatsappLogs records.
// ============================================================

exports.whatsappWebhook = onRequest(
  {
    region: "asia-south1",
    invoker: "public",
    secrets: [WHATSAPP_VERIFY_TOKEN, META_APP_SECRET],
  },
  async (req, res) => {
    // Meta webhook verification handshake.
    if (req.method === "GET") {
      const mode = req.query["hub.mode"];
      const token = req.query["hub.verify_token"];
      const challenge = req.query["hub.challenge"];

      if (
        mode === "subscribe" &&
        typeof token === "string" &&
        token === WHATSAPP_VERIFY_TOKEN.value()
      ) {
        console.log("WhatsApp webhook verified successfully.");
        return res.status(200).send(String(challenge || ""));
      }

      console.warn("WhatsApp webhook verification failed.");
      return res.sendStatus(403);
    }

    if (req.method !== "POST") {
      res.set("Allow", "GET, POST");
      return res.status(405).send("Method Not Allowed");
    }

    // Validate that the POST really came from Meta.
    try {
      const signature = req.get("x-hub-signature-256") || "";
      const appSecret = META_APP_SECRET.value();
      const rawBody = req.rawBody;

      if (!signature.startsWith("sha256=") || !rawBody) {
        console.warn("WhatsApp webhook rejected: missing signature or raw body.");
        return res.sendStatus(401);
      }

      const expected = crypto
        .createHmac("sha256", appSecret)
        .update(rawBody)
        .digest("hex");

      const receivedBuffer = Buffer.from(signature.slice(7), "hex");
      const expectedBuffer = Buffer.from(expected, "hex");

      if (
        receivedBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
      ) {
        console.warn("WhatsApp webhook rejected: invalid signature.");
        return res.sendStatus(401);
      }
    } catch (error) {
      console.error("WhatsApp webhook signature validation error:", error);
      return res.sendStatus(401);
    }

    try {
      const body = req.body || {};
      if (body.object !== "whatsapp_business_account") {
        return res.sendStatus(404);
      }

      const statusUpdates = [];

      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          const value = change.value || {};

          for (const item of value.statuses || []) {
            const messageId = String(item.id || "");
            const status = String(item.status || "").toLowerCase();

            if (!messageId || !status) continue;

            const update = {
              status,
              recipientId: item.recipient_id || null,
              statusTimestamp: item.timestamp
                ? new Date(Number(item.timestamp) * 1000)
                : null,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            };

            if (Array.isArray(item.errors) && item.errors.length) {
              update.errors = item.errors.map((error) => ({
                code: error.code || null,
                title: error.title || null,
                message: error.message || null,
                details: error.error_data?.details || null,
              }));
            }

            const matchingLogs = await db
              .collection("whatsappLogs")
              .where("messageId", "==", messageId)
              .limit(10)
              .get();

            if (!matchingLogs.empty) {
              const batch = db.batch();
              matchingLogs.docs.forEach((docSnap) => {
                batch.update(docSnap.ref, update);
              });
              await batch.commit();
            } else {
              // Preserve the event even if the original log is not found.
              await db.collection("whatsappWebhookEvents").add({
                messageId,
                ...update,
                receivedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            }

            statusUpdates.push({ messageId, status });
            console.log("WhatsApp delivery status received:", {
              messageId,
              status,
              recipientId: item.recipient_id || null,
            });
          }
        }
      }

      // Acknowledge quickly so Meta does not keep retrying the event.
      return res.status(200).json({
        success: true,
        processed: statusUpdates.length,
      });
    } catch (error) {
      console.error("WhatsApp webhook processing error:", error);
      return res.sendStatus(500);
    }
  }
);



// ============================================================
// ONLINEWALAA - BOOKING WHATSAPP NOTIFICATIONS
// Sends:
// 1) Customer: onlinewalaa_service_booking_confirmation (Marathi)
// 2) Admin: onlinewalaa_new_booking_admin (English)
//
// Customer message is sent ONLY when users/{userId}.whatsappOptIn
// is explicitly true. Admin notification is sent independently.
// ============================================================

// IMPORTANT: Replace this with the admin's WhatsApp number in
// international format, digits only: country code + mobile number.
// Example format: "919876543210"
const ADMIN_WHATSAPP_NUMBER = "918788647637";

exports.notifyAdminAndCustomerNewBooking = onDocumentCreated(
  {
    document: "bookings/{bookingId}",
    region: "asia-south1",
    retry: false,
    secrets: [WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID],
  },
  async (event) => {
    const bookingSnap = event.data;
    if (!bookingSnap) {
      console.log("Booking event has no document data.");
      return;
    }

    const booking = bookingSnap.data() || {};
    const bookingId = event.params.bookingId;

    const token = WHATSAPP_ACCESS_TOKEN.value();
    const phoneNumberId = WHATSAPP_PHONE_NUMBER_ID.value();
    const apiUrl =
      `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`;

    const cleanPhone = (value) => {
      let digits = String(value || "").replace(/\D/g, "");
      if (digits.length === 10) digits = `91${digits}`;
      if (digits.length === 12 && digits.startsWith("91")) return digits;
      return "";
    };

    const money = (value) => {
      const amount = Number(value || 0);
      return Number.isFinite(amount) ? String(amount) : "0";
    };

    const sendTemplate = async ({
      to,
      templateName,
      language,
      parameters,
      logType,
    }) => {
      const logRef = db.collection("whatsappLogs").doc(
        `${bookingId}_${logType}`
      );

      // Prevent duplicate sends if the same Firestore event is delivered twice.
      const alreadyStarted = await db.runTransaction(async (transaction) => {
        const existing = await transaction.get(logRef);
        if (existing.exists) return true;

        transaction.create(logRef, {
          bookingId,
          userId: booking.userId || null,
          mobile: to,
          templateName,
          type: logType,
          status: "sending",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return false;
      });

      if (alreadyStarted) {
        console.log(`WhatsApp ${logType} already started for booking ${bookingId}.`);
        return { skipped: true, reason: "already_started" };
      }

      try {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to,
            type: "template",
            template: {
              name: templateName,
              language: { code: language },
              components: [
                {
                  type: "body",
                  parameters: parameters.map((value) => ({
                    type: "text",
                    text: String(value ?? "").slice(0, 1000),
                  })),
                },
              ],
            },
          }),
        });

        const result = await response.json();

        if (!response.ok || !result?.messages?.[0]?.id) {
          const message =
            result?.error?.message || "WhatsApp template send failed.";

          await logRef.update({
            status: "failed",
            error: message,
            metaErrorCode: result?.error?.code || null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          console.error(`WhatsApp ${logType} failed:`, {
            bookingId,
            status: response.status,
            code: result?.error?.code || null,
            message,
          });

          return { success: false, error: message };
        }

        const messageId = result.messages[0].id;

        await logRef.update({
          status: "accepted",
          messageId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return { success: true, messageId };
      } catch (error) {
        await logRef.update({
          status: "failed",
          error: error?.message || "Unknown WhatsApp error.",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.error(`WhatsApp ${logType} exception:`, error);
        return { success: false, error: error?.message || "Unknown error" };
      }
    };

    const results = {};

    // ----------------------------------------------------------
    // 1. ADMIN NOTIFICATION
    // Template: onlinewalaa_new_booking_admin
    // Language: English | Body variables: {{1}} to {{9}}
    // ----------------------------------------------------------
    const adminNumber = cleanPhone(ADMIN_WHATSAPP_NUMBER);

    if (!adminNumber) {
      console.error(
        "Admin WhatsApp number is not configured. Update ADMIN_WHATSAPP_NUMBER.",
        { bookingId }
      );
      results.admin = { success: false, error: "Admin number not configured." };
    } else {
      results.admin = await sendTemplate({
        to: adminNumber,
        templateName: "onlinewalaa_new_booking_admin",
        language: "en",
        logType: "booking_admin_notification",
        parameters: [
          booking.userName || "Customer",        // {{1}} Customer Name
          booking.userMobile || "",              // {{2}} Mobile
          booking.userEmail || "",               // {{3}} Email
          booking.service || "",                 // {{4}} Service
          booking.date || "",                    // {{5}} Date
          booking.time || "",                    // {{6}} Time
          money(booking.govtFee),                // {{7}} Government Fee
          money(booking.serviceCharge),          // {{8}} Service Charge
          money(booking.total),                  // {{9}} Total Amount
        ],
      });
    }

    // ----------------------------------------------------------
    // 2. CUSTOMER CONFIRMATION
    // Template: onlinewalaa_service_booking_confirmation
    // Language: Marathi (mr) | Body variables: {{1}} to {{5}}
    // Send only with recorded explicit WhatsApp consent.
    // ----------------------------------------------------------
    try {
      const userId = String(booking.userId || "").trim();

      if (!userId) {
        results.customer = { skipped: true, reason: "Booking has no userId." };
      } else {
        const userSnap = await db.collection("users").doc(userId).get();
        const userData = userSnap.exists ? userSnap.data() || {} : {};

        if (userData.whatsappOptIn !== true) {
          results.customer = {
            skipped: true,
            reason: "Customer has not explicitly opted in to WhatsApp.",
          };
          console.log("Customer WhatsApp skipped: no opt-in.", { bookingId, userId });
        } else {
          const customerNumber = cleanPhone(
            booking.userMobile ||
            userData.mobile ||
            userData.phoneNumber ||
            userData.mobileNumber
          );

          if (!customerNumber) {
            results.customer = {
              success: false,
              error: "Customer mobile number is invalid.",
            };
          } else {
            results.customer = await sendTemplate({
              to: customerNumber,
              templateName: "onlinewalaa_service_booking_confirmation",
              language: "mr",
              logType: "booking_customer_confirmation",
              parameters: [
                booking.userName || userData.name || "Customer", // {{1}}
                booking.service || "",                            // {{2}}
                booking.date || "",                               // {{3}}
                booking.time || "",                               // {{4}}
                money(booking.total),                             // {{5}}
              ],
            });
          }
        }
      }
    } catch (error) {
      console.error("Customer booking WhatsApp processing failed:", {
        bookingId,
        message: error?.message,
      });
      results.customer = {
        success: false,
        error: error?.message || "Customer notification failed.",
      };
    }

    console.log("Booking WhatsApp notification processing complete.", {
      bookingId,
      admin: results.admin?.success ? "accepted" : results.admin?.skipped ? "skipped" : "failed",
      customer: results.customer?.success ? "accepted" : results.customer?.skipped ? "skipped" : "failed",
    });

    return results;
  }
);


// ============================================================
// ONLINEWALAA MOBILE RECHARGE (PARIPRINT)
// Append this block at the END of functions/index.js.
// Secrets: PARIPRINT_RC_KEY_ID and PARIPRINT_RC_SECRET
// ============================================================
const PARIPRINT_RC_KEY_ID = defineSecret("PARIPRINT_RC_KEY_ID");
const PARIPRINT_RC_SECRET = defineSecret("PARIPRINT_RC_SECRET");
const RC_API_URL = "https://pariprint.in/recharge/api.php";
const RC_CUSTOMER_DISCOUNT = 3; // Customer discount in INR (admin-configured)
const RC_REGION = "asia-south1";

function rcNonce() {
  return crypto.randomBytes(16).toString("hex");
}

async function callPariPrintRecharge(body) {
  const rawBody = JSON.stringify(body);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = rcNonce();
  const signature = crypto
    .createHmac("sha256", PARIPRINT_RC_SECRET.value())
    .update(`${timestamp}\n${nonce}\n${rawBody}`, "utf8")
    .digest("hex");

  const response = await fetch(RC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-RC-Key": PARIPRINT_RC_KEY_ID.value(),
      "X-RC-Timestamp": timestamp,
      "X-RC-Nonce": nonce,
      "X-RC-Signature": signature,
    },
    body: rawBody,
    signal: AbortSignal.timeout(25000),
  });

  const text = await response.text();
  let data;
  try { data = JSON.parse(text); }
  catch { throw new Error(`Recharge provider returned invalid JSON (HTTP ${response.status}).`); }

  if (!response.ok || data?.success === false) {
    const err = new Error(data?.message || data?.error || `Provider HTTP ${response.status}`);
    err.providerDefinitive = response.status >= 400 && response.status < 500;
    err.providerData = data;
    throw err;
  }
  return data;
}

function rcCleanMobile(value) {
  const mobile = String(value || "").replace(/\D/g, "");
  if (!/^[6-9]\d{9}$/.test(mobile)) {
    throw new HttpsError("invalid-argument", "Valid 10 digit mobile number required.");
  }
  return mobile;
}

async function rcRefundCustomer(orderRef, orderData, reason) {
  return db.runTransaction(async (tx) => {
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists) return;
    const current = orderSnap.data();
    if (current.refundStatus === "refunded" || current.status === "success") return;
    const userRef = db.collection("users").doc(current.userId);
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) throw new Error("Customer profile missing during refund.");
    const user = userSnap.data() || {};
    const debit = Number(current.customerPayable || 0);
    const wallet = Number(user.walletBalance ?? user.wallet ?? 0);
    const available = Number(user.availableBalance ?? wallet);
    tx.update(userRef, {
      walletBalance: wallet + debit,
      availableBalance: available + debit,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    tx.set(db.collection("walletTransactions").doc(), {
      uid: current.userId,
      userId: current.userId,
      type: "CREDIT",
      direction: "CREDIT",
      service: "MOBILE_RECHARGE_REFUND",
      amount: debit,
      isCredit: true,
      referenceId: orderRef.id,
      description: `Mobile recharge refund: ${current.mobile}`,
      balanceBefore: wallet,
      balanceAfter: wallet + debit,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    tx.update(orderRef, {
      status: "failed",
      refundStatus: "refunded",
      refundReason: String(reason || "Recharge failed"),
      refundedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
}

async function rcApplyProviderStatus(orderRef, providerData) {
  const providerStatus = String(providerData?.status || "pending").toLowerCase();
  if (providerStatus === "failed") {
    await rcRefundCustomer(orderRef, null, providerData?.message || "Provider marked recharge failed");
  } else {
    await orderRef.set({
      status: providerStatus === "success" ? "success" : "pending",
      transactionId: providerData?.transaction_id || "",
      operatorRef: providerData?.operator_ref || "",
      providerRefunded: Boolean(providerData?.refunded),
      providerMessage: providerData?.message || "",
      providerUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  }
  return providerStatus;
}

exports.getMobileRechargePlans = onCall({
  region: RC_REGION,
  invoker: "public",
  timeoutSeconds: 40,
  secrets: [PARIPRINT_RC_KEY_ID, PARIPRINT_RC_SECRET],
}, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Please login first.");
  const mobile = rcCleanMobile(request.data?.mobile);
  try {
    const data = await callPariPrintRecharge({ action: "plans", mobile });
    if (!Array.isArray(data.plans)) throw new Error("Provider did not return plans.");
    return {
      success: true,
      mobile,
      operator_code: Number(data.operator_code),
      operator: data.operator || "",
      circle: data.circle || "",
      plans: data.plans.map((p) => ({
        amount: String(p.amount),
        type: p.type || "",
        validity: String(p.validity || ""),
        talk_time: p.talk_time || "",
        description: p.description || "",
        discount: String(p.discount || "0"),
        wallet_debit: String(p.wallet_debit || p.amount),
      })),
    };
  } catch (error) {
    console.error("getMobileRechargePlans:", error.message);
    throw new HttpsError("failed-precondition", error.message || "Plans unavailable.");
  }
});

exports.submitMobileRecharge = onCall({
  region: RC_REGION,
  invoker: "public",
  timeoutSeconds: 60,
  memory: "256MiB",
  secrets: [PARIPRINT_RC_KEY_ID, PARIPRINT_RC_SECRET],
}, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Please login first.");
  const mobile = rcCleanMobile(request.data?.mobile);
  const amount = Number(request.data?.amount);
  const operatorCode = Number(request.data?.operatorCode);
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(operatorCode)) {
    throw new HttpsError("invalid-argument", "Invalid recharge plan.");
  }

  const resolved = await resolveOnlineWalaaUser(request);
  const userId = resolved.userId;
  // Re-fetch plans server-side; do not trust price/operator values from browser.
  let plansData;
  try {
    plansData = await callPariPrintRecharge({ action: "plans", mobile });
  } catch (e) {
    throw new HttpsError("failed-precondition", e.message || "Could not verify selected plan.");
  }
  const matchedPlan = (plansData.plans || []).find((p) =>
    Math.abs(Number(p.amount) - amount) < 0.001
  );
  if (!matchedPlan || Number(plansData.operator_code) !== operatorCode) {
    throw new HttpsError("failed-precondition", "Selected plan is no longer available. Please load plans again.");
  }

  const customerPayable = Math.max(0, Math.round((amount - RC_CUSTOMER_DISCOUNT) * 100) / 100);
  const providerCost = Number(matchedPlan.wallet_debit);
  if (!Number.isFinite(providerCost) || providerCost <= 0) {
    throw new HttpsError("failed-precondition", "Provider cost could not be verified.");
  }

  const clientRef = `OW${Date.now().toString(36)}${crypto.randomBytes(5).toString("hex")}`.slice(0, 32);
  const orderRef = db.collection("mobileRechargeOrders").doc();
  const userRef = db.collection("users").doc(userId);
  const walletTxnRef = db.collection("walletTransactions").doc();

  await db.runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) throw new HttpsError("not-found", "User profile not found.");
    const user = userSnap.data() || {};
    const wallet = Number(user.walletBalance ?? user.wallet ?? 0);
    const available = Number(user.availableBalance ?? wallet);
    if (customerPayable > available) {
      throw new HttpsError("failed-precondition", `Insufficient wallet balance. Available: ₹${available.toFixed(2)}`);
    }
    tx.update(userRef, {
      walletBalance: wallet - customerPayable,
      availableBalance: available - customerPayable,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    tx.set(walletTxnRef, {
      uid: userId, userId,
      type: "DEBIT", direction: "DEBIT",
      service: "MOBILE_RECHARGE",
      amount: customerPayable,
      isCredit: false,
      referenceId: orderRef.id,
      description: `Mobile recharge ${mobile} (${plansData.operator || ""})`,
      balanceBefore: wallet,
      balanceAfter: wallet - customerPayable,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    tx.create(orderRef, {
      userId,
      authUid: request.auth.uid,
      mobile,
      operator: plansData.operator || "",
      circle: plansData.circle || "",
      operatorCode,
      amount,
      providerCost,
      providerDiscount: Number(matchedPlan.discount || 0),
      customerDiscount: RC_CUSTOMER_DISCOUNT,
      customerPayable,
      estimatedProfitLoss: customerPayable - providerCost,
      clientRef,
      status: "processing",
      refundStatus: "not_refunded",
      walletTransactionId: walletTxnRef.id,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  try {
    const provider = await callPariPrintRecharge({
      action: "recharge",
      mobile,
      amount: amount.toFixed(2),
      client_ref: clientRef,
      operator_code: operatorCode,
    });
    const status = String(provider.status || "pending").toLowerCase();
    await orderRef.set({
      status: status === "success" ? "success" : status === "failed" ? "failed" : "pending",
      transactionId: provider.transaction_id || "",
      operatorRef: provider.operator_ref || "",
      providerMessage: provider.message || "",
      providerWalletDebit: Number(provider.wallet_debit || providerCost),
      providerResponseAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    if (status === "failed") {
      await rcRefundCustomer(orderRef, null, provider.message || "Provider rejected recharge");
    }
    return { success: true, orderId: orderRef.id, clientRef, status };
  } catch (error) {
    console.error("submitMobileRecharge provider error:", error.message);
    // Definite provider rejection: refund customer. Network/timeout/5xx is ambiguous;
    // keep debit reserved and use the SAME client_ref for status resolution.
    if (error.providerDefinitive) {
      await rcRefundCustomer(orderRef, null, error.message);
      throw new HttpsError("failed-precondition", error.message || "Recharge rejected; wallet refunded.");
    }
    await orderRef.set({
      status: "pending",
      providerMessage: "Provider response uncertain. Check status; do not create a second recharge.",
      lastProviderError: error.message || "Network timeout",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    return { success: true, orderId: orderRef.id, clientRef, status: "pending" };
  }
});

exports.checkMobileRechargeStatus = onCall({
  region: RC_REGION,
  invoker: "public",
  timeoutSeconds: 40,
  secrets: [PARIPRINT_RC_KEY_ID, PARIPRINT_RC_SECRET],
}, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Please login first.");
  const orderId = String(request.data?.orderId || "");
  if (!orderId) throw new HttpsError("invalid-argument", "Order ID required.");
  const resolved = await resolveOnlineWalaaUser(request);
  const orderRef = db.collection("mobileRechargeOrders").doc(orderId);
  const snap = await orderRef.get();
  if (!snap.exists) throw new HttpsError("not-found", "Recharge order not found.");
  const order = snap.data();
  if (order.userId !== resolved.userId) throw new HttpsError("permission-denied", "Not your recharge order.");
  if (order.status === "success" || order.status === "failed") {
    return { success: true, status: order.status, refundStatus: order.refundStatus };
  }
  try {
    const provider = await callPariPrintRecharge({ action: "status", client_ref: order.clientRef });
    const status = String(provider.status || "pending").toLowerCase();
    if (status === "failed") {
      await rcRefundCustomer(orderRef, null, provider.message || "Provider failed");
    } else {
      await orderRef.set({
        status: status === "success" ? "success" : "pending",
        transactionId: provider.transaction_id || order.transactionId || "",
        operatorRef: provider.operator_ref || "",
        providerMessage: provider.message || "",
        providerRefunded: Boolean(provider.refunded),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }
    return { success: true, status };
  } catch (error) {
    console.error("checkMobileRechargeStatus:", error.message);
    throw new HttpsError("unavailable", "Status could not be checked. Please retry later.");
  }
});

exports.getMobileRechargeAdminReport = onCall({
  region: RC_REGION,
  invoker: "public",
}, async (request) => {
  checkAdmin(request);
  const snap = await db.collection("mobileRechargeOrders")
    .orderBy("createdAt", "desc").limit(500).get();
  const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const totals = orders.reduce((a, o) => {
    if (o.status === "success") {
      a.successCount += 1;
      a.customerRevenue += Number(o.customerPayable || 0);
      a.providerCost += Number(o.providerCost || 0);
      a.profitLoss += Number(o.estimatedProfitLoss || 0);
    }
    if (o.status === "pending" || o.status === "processing") a.pendingCount += 1;
    if (o.status === "failed") a.failedCount += 1;
    return a;
  }, { successCount: 0, pendingCount: 0, failedCount: 0, customerRevenue: 0, providerCost: 0, profitLoss: 0 });
  return { success: true, totals, orders };
});

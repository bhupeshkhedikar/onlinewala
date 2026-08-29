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


/* =========================================================
   FIREBASE
========================================================= */

admin.initializeApp();

const db =
  admin.firestore();


/* =========================================================
   RAZORPAY SECRETS
========================================================= */

const RAZORPAY_KEY_ID =
  defineSecret(
    "RAZORPAY_KEY_ID"
  );

const RAZORPAY_KEY_SECRET =
  defineSecret(
    "RAZORPAY_KEY_SECRET"
  );


/* =========================================================
   CREATE WALLET ORDER
========================================================= */

exports.createWalletOrder =
  onCall(
    {
      region: "asia-south1",

      /*
       * IMPORTANT
       *
       * Firebase callable function को browser से
       * invoke करने के लिए public invoker.
       *
       * Application level authentication नीचे
       * request.auth से separately check हो रही है.
       */
      invoker: "public",

      secrets: [
        RAZORPAY_KEY_ID,
        RAZORPAY_KEY_SECRET,
      ],
    },

    async (request) => {

      /* -----------------------------------------------------
         AUTH
      ----------------------------------------------------- */

      if (!request.auth) {

        throw new HttpsError(
          "unauthenticated",
          "Please login first."
        );

      }


      const userId =
        request.auth.uid;


      /* -----------------------------------------------------
         AMOUNT
      ----------------------------------------------------- */

      const amount =
        Number(
          request.data?.amount
        );


      if (
        !Number.isFinite(
          amount
        )
      ) {

        throw new HttpsError(
          "invalid-argument",
          "Invalid amount."
        );

      }


      if (
        amount < 10
      ) {

        throw new HttpsError(
          "invalid-argument",
          "Minimum wallet recharge is ₹10."
        );

      }


      if (
        amount > 50000
      ) {

        throw new HttpsError(
          "invalid-argument",
          "Maximum wallet recharge is ₹50,000."
        );

      }


      /*
       * Wallet amount should be whole rupees.
       *
       * This avoids fractional recharge values.
       */
      if (
        !Number.isInteger(
          amount
        )
      ) {

        throw new HttpsError(
          "invalid-argument",
          "Amount must be a whole number."
        );

      }


      /* -----------------------------------------------------
         RAZORPAY
      ----------------------------------------------------- */

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


      /* -----------------------------------------------------
         CREATE FIRESTORE RECHARGE REQUEST
      ----------------------------------------------------- */

      let rechargeRef;

      try {

        rechargeRef =
          await db
            .collection(
              "walletRechargeRequests"
            )
            .add({

              userId:
                userId,

              amount:
                amount,

              currency:
                "INR",

              status:
                "created",

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


      /* -----------------------------------------------------
         CREATE RAZORPAY ORDER

         ₹1 = 100 paise
      ----------------------------------------------------- */

      let order;

      try {

        order =
          await razorpay.orders.create({

            amount:
              Math.round(
                amount * 100
              ),

            currency:
              "INR",

            receipt:
              rechargeRef.id,

            notes: {

              userId:
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


      /* -----------------------------------------------------
         SAVE ORDER ID
      ----------------------------------------------------- */

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


      /* -----------------------------------------------------
         SEND ORDER TO FRONTEND
      ----------------------------------------------------- */

      return {

        success:
          true,

        rechargeId:
          rechargeRef.id,

        orderId:
          order.id,

        amount:
          amount,

        amountInPaise:
          order.amount,

        currency:
          order.currency,

        /*
         * Key ID is public/client-side information.
         * NEVER send RAZORPAY_KEY_SECRET.
         */
        keyId:
          RAZORPAY_KEY_ID.value(),

      };

    }
  );


/* =========================================================
   VERIFY WALLET PAYMENT
========================================================= */

exports.verifyWalletPayment =
  onCall(
    {
      region: "asia-south1",

      /*
       * Required so browser can invoke callable endpoint.
       */
      invoker: "public",

      secrets: [
        RAZORPAY_KEY_ID,
        RAZORPAY_KEY_SECRET,
      ],
    },

    async (request) => {

      /* -----------------------------------------------------
         AUTH
      ----------------------------------------------------- */

      if (!request.auth) {

        throw new HttpsError(
          "unauthenticated",
          "Please login first."
        );

      }


      const userId =
        request.auth.uid;


      /* -----------------------------------------------------
         PAYMENT DATA
      ----------------------------------------------------- */

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


      /* -----------------------------------------------------
         RECHARGE DOCUMENT
      ----------------------------------------------------- */

      const rechargeRef =
        db
          .collection(
            "walletRechargeRequests"
          )
          .doc(
            rechargeId
          );


      const rechargeSnap =
        await rechargeRef.get();


      if (
        !rechargeSnap.exists
      ) {

        throw new HttpsError(
          "not-found",
          "Recharge request not found."
        );

      }


      const recharge =
        rechargeSnap.data();


      /* -----------------------------------------------------
         OWNER CHECK
      ----------------------------------------------------- */

      if (
        recharge.userId !==
        userId
      ) {

        throw new HttpsError(
          "permission-denied",
          "This payment does not belong to you."
        );

      }


      /* -----------------------------------------------------
         ORDER CHECK
      ----------------------------------------------------- */

      if (
        recharge.razorpayOrderId !==
        razorpayOrderId
      ) {

        throw new HttpsError(
          "invalid-argument",
          "Razorpay order mismatch."
        );

      }


      /* -----------------------------------------------------
         ALREADY PROCESSED
      ----------------------------------------------------- */

      if (
        recharge.status ===
        "paid"
      ) {

        return {

          success:
            true,

          alreadyProcessed:
            true,

          amount:
            Number(
              recharge.amount
            ),

          message:
            "Payment already processed.",

        };

      }


      /* -----------------------------------------------------
         SIGNATURE VERIFICATION
         
         HMAC SHA256(
           order_id + "|" + payment_id,
           key_secret
         )
      ----------------------------------------------------- */

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
            .digest(
              "hex"
            );

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


      /* -----------------------------------------------------
         SAFE SIGNATURE COMPARISON
         
         timingSafeEqual throws if buffer lengths
         are different, so check length first.
      ----------------------------------------------------- */

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

          razorpayPaymentId:
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


      if (
        !signaturesMatch
      ) {

        await rechargeRef.update({

          status:
            "verification_failed",

          razorpayPaymentId:
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


      /* -----------------------------------------------------
         AMOUNT
      ----------------------------------------------------- */

      const amount =
        Number(
          recharge.amount
        );


      if (
        !Number.isFinite(
          amount
        ) ||
        amount <= 0
      ) {

        throw new HttpsError(
          "invalid-argument",
          "Invalid recharge amount."
        );

      }


      /* -----------------------------------------------------
         USER
      ----------------------------------------------------- */

      const userRef =
        db
          .collection(
            "users"
          )
          .doc(
            userId
          );


      /* -----------------------------------------------------
         WALLET TRANSACTION
      ----------------------------------------------------- */

      const walletTransactionRef =
        db
          .collection(
            "walletTransactions"
          )
          .doc();


      /* -----------------------------------------------------
         FIRESTORE ATOMIC TRANSACTION
      ----------------------------------------------------- */

      await db.runTransaction(
        async (
          transaction
        ) => {

          /* -----------------------------------------------
             GET USER
          ------------------------------------------------ */

          const userSnap =
            await transaction.get(
              userRef
            );


          if (
            !userSnap.exists
          ) {

            throw new HttpsError(
              "not-found",
              "User profile not found."
            );

          }


          /* -----------------------------------------------
             GET RECHARGE AGAIN INSIDE TRANSACTION
             
             This prevents duplicate processing if two
             verification requests arrive at almost the
             same time.
          ------------------------------------------------ */

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


          /* -----------------------------------------------
             CHECK PAYMENT STATUS
          ------------------------------------------------ */

          if (
            transactionRecharge.status ===
            "paid"
          ) {

            return;

          }


          /* -----------------------------------------------
             CURRENT USER DATA
          ------------------------------------------------ */

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


          /* -----------------------------------------------
             NEW BALANCES
          ------------------------------------------------ */

          const newWallet =
            currentWallet +
            amount;


          const newAvailable =
            currentAvailable +
            amount;


          /* -----------------------------------------------
             UPDATE USER WALLET
          ------------------------------------------------ */

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


          /* -----------------------------------------------
             TRANSACTION RECORD
          ------------------------------------------------ */

          transaction.set(
            walletTransactionRef,
            {

              userId:
                userId,

              amount:
                amount,

              type:
                "RECHARGE",

              direction:
                "CREDIT",

              status:
                "success",

              paymentGateway:
                "razorpay",

              razorpayOrderId:
                razorpayOrderId,

              razorpayPaymentId:
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


          /* -----------------------------------------------
             MARK RECHARGE PAID
          ------------------------------------------------ */

          transaction.update(
            rechargeRef,
            {

              status:
                "paid",

              razorpayPaymentId:
                razorpayPaymentId,

              razorpaySignature:
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


      /* -----------------------------------------------------
         SUCCESS
      ----------------------------------------------------- */

      return {

        success:
          true,

        amount:
          amount,

        message:
          `₹${amount} wallet में successfully add हो गए.`,

      };

    }
  );

  /* =========================================================
   ADMIN HELPER
========================================================= */

/*
 * IMPORTANT:
 *
 * Admin functions Firebase Authentication वाले
 * authenticated admin user से ही चलेंगे.
 *
 * Tumhare current Login.jsx में local admin bypass है:
 *
 * admin@onlinewala.com + password
 *
 * लेकिन local bypass Firebase Auth user नहीं बनाता.
 *
 * इसलिए AdminReferral से ये functions चलाने के लिए
 * admin@onlinewala.com का actual Firebase Auth account
 * होना जरूरी है.
 */

const ADMIN_EMAIL =
  "admin@onlinewala.com";


function checkAdmin(
  request
) {

  if (
    !request.auth
  ) {

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


/* =========================================================
   ADMIN APPROVE REFERRAL
========================================================= */

exports.adminApproveReferral =
  onCall(
    {
      region: "asia-south1",

      /*
       * Browser callable function.
       *
       * Actual admin authentication is checked
       * inside checkAdmin().
       */
      invoker: "public",
    },

    async (request) => {

      /* -----------------------------------------------------
         ADMIN CHECK
      ----------------------------------------------------- */

      checkAdmin(
        request
      );


      /* -----------------------------------------------------
         INPUT
      ----------------------------------------------------- */

      const referralId =
        String(
          request.data?.referralId ||
          ""
        ).trim();


      if (
        !referralId
      ) {

        throw new HttpsError(
          "invalid-argument",
          "Referral ID is required."
        );

      }


      /* -----------------------------------------------------
         REFERRAL DOCUMENT
      ----------------------------------------------------- */

      const referralRef =
        db
          .collection(
            "referrals"
          )
          .doc(
            referralId
          );


      /* -----------------------------------------------------
         FIRESTORE TRANSACTION
      ----------------------------------------------------- */

      let result;


      try {

        result =
          await db.runTransaction(
            async (
              transaction
            ) => {

              /* =============================================
                 GET REFERRAL
              ============================================= */

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


              /* =============================================
                 STATUS CHECK
              ============================================= */

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


              /* =============================================
                 REFERRER
                 
                 ONLY THE PERSON WHO REFERRED THE USER
                 GETS THE REWARD.
                 
                 Referred user gets ₹0.
              ============================================= */

              const referrerId =
                referral.referrerId;


              if (
                !referrerId
              ) {

                throw new HttpsError(
                  "invalid-argument",
                  "Referral referrerId is missing."
                );

              }


              const referrerRef =
                db
                  .collection(
                    "users"
                  )
                  .doc(
                    referrerId
                  );


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


              /* =============================================
                 REWARD AMOUNT
                 
                 Reward should already have been generated
                 when referral was created.
                 
                 Admin does NOT choose the reward amount.
              ============================================= */

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


              /* =============================================
                 CURRENT BALANCES
              ============================================= */

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


              /* =============================================
                 IMPORTANT
                 
                 Pending referral reward is assumed to have
                 already been included in walletBalance.
                 
                 It is NOT added to walletBalance again.
                 
                 We only move it from pending → available.
              ============================================= */

              const newAvailable =
                currentAvailable +
                rewardAmount;


              /* =============================================
                 UPDATE REFERRER
              ============================================= */

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


              /* =============================================
                 ADMIN APPROVAL TRANSACTION
              ============================================= */

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


              /* =============================================
                 UPDATE REFERRAL
              ============================================= */

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

                referrerId:
                  referrerId,

              };

            }
          );


      } catch (
        error
      ) {

        console.error(
          "Admin approve referral error:",
          error
        );


        /*
         * Preserve Firebase HttpsError.
         */

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


      /* -----------------------------------------------------
         RESPONSE
      ----------------------------------------------------- */

      return {

        success:
          true,

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


/* =========================================================
   ADMIN REJECT REFERRAL
========================================================= */

exports.adminRejectReferral =
  onCall(
    {
      region: "asia-south1",

      invoker: "public",
    },

    async (request) => {

      /* -----------------------------------------------------
         ADMIN CHECK
      ----------------------------------------------------- */

      checkAdmin(
        request
      );


      /* -----------------------------------------------------
         INPUT
      ----------------------------------------------------- */

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


      if (
        !referralId
      ) {

        throw new HttpsError(
          "invalid-argument",
          "Referral ID is required."
        );

      }


      /* -----------------------------------------------------
         REFERRAL
      ----------------------------------------------------- */

      const referralRef =
        db
          .collection(
            "referrals"
          )
          .doc(
            referralId
          );


      try {

        await db.runTransaction(
          async (
            transaction
          ) => {

            /* =============================================
               GET REFERRAL
            ============================================= */

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


            /* =============================================
               STATUS
            ============================================= */

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


            /* =============================================
               REFERRER
            ============================================= */

            const referrerId =
              referral.referrerId;


            if (
              !referrerId
            ) {

              throw new HttpsError(
                "invalid-argument",
                "Referral referrerId is missing."
              );

            }


            const referrerRef =
              db
                .collection(
                  "users"
                )
                .doc(
                  referrerId
                );


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


            /* =============================================
               REWARD
            ============================================= */

            const rewardAmount =
              Number(
                referral.rewardAmount ||
                referral.reward ||
                0
              );


            /* =============================================
               PENDING REWARD WAS SHOWN IN walletBalance
               
               Therefore on rejection we remove it.
               
               Example:
               
               walletBalance = ₹150
               pending reward = ₹50
               
               after rejection:
               walletBalance = ₹100
               
               availableBalance remains unchanged.
            ============================================= */

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


            /* =============================================
               UPDATE REFERRER
            ============================================= */

            transaction.update(
              referrerRef,
              {

                walletBalance:
                  newWallet,

                /*
                 * availableBalance is NOT changed.
                 */

                availableBalance:
                  currentAvailable,

                updatedAt:
                  admin.firestore
                    .FieldValue
                    .serverTimestamp(),

              }
            );


            /* =============================================
               REFERRAL REJECTION
            ============================================= */

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


      } catch (
        error
      ) {

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


      /* -----------------------------------------------------
         RESPONSE
      ----------------------------------------------------- */

      return {

        success:
          true,

        referralId:
          referralId,

        message:
          "Referral rejected successfully.",

      };

    }
  );
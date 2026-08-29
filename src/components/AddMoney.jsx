
import { useState } from "react";

import {
  app,
  auth,
} from "./firebase";

import {
  getFunctions,
  httpsCallable,
} from "firebase/functions";

import "./AddMoney.css";


export default function AddMoney({
  onSuccess,
  onClose,
}) {

  /* =========================================================
     STATE
  ========================================================= */

  const [amount, setAmount] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");


  /* =========================================================
     FIREBASE CLOUD FUNCTIONS
     
     IMPORTANT:
     Function region MUST match backend.
     
     Backend:
     asia-south1
  ========================================================= */

  const functions =
    getFunctions(
      app,
      "asia-south1"
    );


  /* =========================================================
     PRESET AMOUNTS
  ========================================================= */

  const presetAmounts = [
    100,
    200,
    500,
    1000,
    2000,
  ];


  /* =========================================================
     LOAD RAZORPAY CHECKOUT
  ========================================================= */

  const loadRazorpay =
    () => {

      return new Promise(
        (resolve) => {

          /* Already loaded */

          if (
            window.Razorpay
          ) {
            resolve(true);
            return;
          }


          const existingScript =
            document.querySelector(
              'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
            );


          if (
            existingScript
          ) {

            existingScript.addEventListener(
              "load",
              () => resolve(true)
            );

            existingScript.addEventListener(
              "error",
              () => resolve(false)
            );

            return;
          }


          const script =
            document.createElement(
              "script"
            );


          script.src =
            "https://checkout.razorpay.com/v1/checkout.js";

          script.async =
            true;


          script.onload =
            () => resolve(true);

          script.onerror =
            () => resolve(false);


          document.body.appendChild(
            script
          );

        }
      );

    };


  /* =========================================================
     VALIDATE AMOUNT
  ========================================================= */

  const validateAmount =
    () => {

      const numericAmount =
        Number(
          amount
        );


      if (
        !amount ||
        amount.trim() === ""
      ) {

        setError(
          "कृपया amount enter करा."
        );

        return false;
      }


      if (
        !Number.isFinite(
          numericAmount
        )
      ) {

        setError(
          "कृपया योग्य amount टाका."
        );

        return false;
      }


      if (
        numericAmount < 10
      ) {

        setError(
          "Minimum ₹10 add करू शकता."
        );

        return false;
      }


      if (
        numericAmount > 50000
      ) {

        setError(
          "Maximum ₹50,000 एकावेळी add करू शकता."
        );

        return false;
      }


      return true;
    };


  /* =========================================================
     HANDLE ADD MONEY
  ========================================================= */

  const handleAddMoney =
    async () => {

      setError("");
      setMessage("");


      /* =====================================================
         GET CURRENT FIREBASE USER
      ===================================================== */

      const currentUser =
        auth.currentUser;


      if (
        !currentUser
      ) {

        setError(
          "तुमचे login session उपलब्ध नाही. कृपया पुन्हा login करा."
        );

        return;
      }


      /* =====================================================
         VALIDATE AMOUNT
      ===================================================== */

      if (
        !validateAmount()
      ) {
        return;
      }


      const numericAmount =
        Number(
          amount
        );


      try {

        setLoading(true);


        /* ===================================================
           REFRESH FIREBASE AUTH TOKEN

           This is important because your Cloud Function
           requires an authenticated Firebase user.
        =================================================== */

        setMessage(
          "Login session verify होत आहे..."
        );


        try {

          await currentUser.getIdToken(
            true
          );

        } catch (
          tokenError
        ) {

          console.error(
            "Firebase token refresh error:",
            tokenError
          );


          throw new Error(
            "Login session expire झाली आहे. कृपया logout करून पुन्हा login करा."
          );

        }


        /* ===================================================
           DEBUG INFORMATION

           Do NOT print token itself.
        =================================================== */

        console.log(
          "Firebase user:",
          currentUser.uid
        );

        console.log(
          "Firebase email:",
          currentUser.email
        );


        /* ===================================================
           LOAD RAZORPAY
        =================================================== */

        setMessage(
          "Payment system loading..."
        );


        const razorpayLoaded =
          await loadRazorpay();


        if (
          !razorpayLoaded
        ) {

          throw new Error(
            "Razorpay checkout load नहीं हो पाया. Internet connection check करें."
          );

        }


        /* ===================================================
           CREATE FIREBASE CALLABLE FUNCTION
        =================================================== */

        const createWalletOrder =
          httpsCallable(
            functions,
            "createWalletOrder"
          );


        /* ===================================================
           CREATE RAZORPAY ORDER

           Firebase Auth token is automatically attached
           by Firebase Functions SDK.
        =================================================== */

        setMessage(
          "Secure payment order create हो रहा है..."
        );


        const result =
          await createWalletOrder({
            amount:
              numericAmount,
          });


        const data =
          result?.data;


        console.log(
          "Create wallet order response:",
          data
        );


        if (
          !data ||
          !data.success
        ) {

          throw new Error(
            "Payment order create नहीं हुआ."
          );

        }


        if (
          !data.orderId
        ) {

          throw new Error(
            "Razorpay order ID नहीं मिला."
          );

        }


        if (
          !data.keyId
        ) {

          throw new Error(
            "Razorpay Key ID नहीं मिला."
          );

        }


        /* ===================================================
           RAZORPAY OPTIONS
        =================================================== */

        const options = {

          key:
            data.keyId,

          amount:
            data.amountInPaise,

          currency:
            data.currency ||
            "INR",

          name:
            "OnlineWalaa",

          description:
            "OnlineWalaa Wallet Recharge",

          order_id:
            data.orderId,


          /* =================================================
             PREFILL
          ================================================= */

          prefill: {

            name:
              currentUser.displayName ||
              "",

            email:
              currentUser.email ||
              "",

          },


          /* =================================================
             NOTES
          ================================================= */

          notes: {

            platform:
              "OnlineWalaa",

            rechargeId:
              data.rechargeId,

          },


          /* =================================================
             THEME
          ================================================= */

          theme: {

            color:
              "#7c3aed",

          },


          /* =================================================
             PAYMENT SUCCESS HANDLER
          ================================================= */

          handler:
            async (
              response
            ) => {

              console.log(
                "Razorpay payment response:",
                response
              );


              try {

                setLoading(
                  true
                );

                setError("");

                setMessage(
                  "Payment received. Verification हो रहा है..."
                );


                /* =========================================
                   VERIFY PAYMENT FUNCTION
                ========================================= */

                const verifyWalletPayment =
                  httpsCallable(
                    functions,
                    "verifyWalletPayment"
                  );


                /* =========================================
                   REFRESH TOKEN AGAIN

                   Extra safety after payment.
                ========================================= */

                await currentUser.getIdToken(
                  true
                );


                /* =========================================
                   VERIFY PAYMENT
                ========================================= */

                const verification =
                  await verifyWalletPayment({

                    rechargeId:
                      data.rechargeId,

                    razorpayOrderId:
                      response.razorpay_order_id,

                    razorpayPaymentId:
                      response.razorpay_payment_id,

                    razorpaySignature:
                      response.razorpay_signature,

                  });


                const verificationData =
                  verification?.data;


                console.log(
                  "Payment verification response:",
                  verificationData
                );


                /* =========================================
                   SUCCESS
                ========================================= */

                if (
                  verificationData?.success
                ) {

                  setMessage(
                    `🎉 ₹${numericAmount.toLocaleString("en-IN")} wallet में successfully add हो गए!`
                  );


                  setAmount("");


                  /* =======================================
                     UPDATE PARENT / WALLET
                  ======================================= */

                  if (
                    onSuccess
                  ) {

                    setTimeout(
                      () => {

                        onSuccess({
                          amount:
                            numericAmount,

                          rechargeId:
                            data.rechargeId,

                        });

                      },
                      1000
                    );

                  }

                } else {

                  throw new Error(
                    "Payment verification failed."
                  );

                }

              } catch (
                verifyError
              ) {

                console.error(
                  "Payment verification error:",
                  verifyError
                );


                setError(
                  verifyError?.message ||
                    "Payment verify नहीं हो पाया."
                );

                setMessage("");

              } finally {

                setLoading(
                  false
                );

              }

            },


          /* =================================================
             MODAL
          ================================================= */

          modal: {

            ondismiss:
              () => {

                if (
                  !loading
                ) {

                  setMessage("");

                }

                setLoading(
                  false
                );

              },

          },

        };


        /* ===================================================
           CREATE RAZORPAY INSTANCE
        =================================================== */

        const razorpay =
          new window.Razorpay(
            options
          );


        /* ===================================================
           PAYMENT FAILED
        =================================================== */

        razorpay.on(
          "payment.failed",
          (
            response
          ) => {

            console.error(
              "Razorpay payment failed:",
              response
            );


            const description =
              response?.error?.description;


            setError(
              description ||
                "Payment failed. कृपया फिर से कोशिश करें."
            );


            setMessage("");

            setLoading(
              false
            );

          }
        );


        /* ===================================================
           OPEN RAZORPAY
        =================================================== */

        razorpay.open();


      } catch (
        err
      ) {

        console.error(
          "Add money error:",
          err
        );


        let errorMessage =
          "Payment शुरू नहीं हो पाया.";


        if (
          err?.code ===
          "functions/unauthenticated"
        ) {

          errorMessage =
            "Firebase login verify नहीं हुआ. कृपया logout करके फिर से login करें.";

        } else if (
          err?.code ===
          "functions/internal"
        ) {

          errorMessage =
            "Payment server से response नहीं मिला. कृपया थोड़ी देर बाद फिर कोशिश करें.";

        } else if (
          err?.message
        ) {

          errorMessage =
            err.message;

        }


        setError(
          errorMessage
        );

        setMessage("");

      } finally {

        setLoading(
          false
        );

      }

    };


  /* =========================================================
     SELECT PRESET AMOUNT
  ========================================================= */

  const selectAmount =
    (value) => {

      if (
        loading
      ) {
        return;
      }


      setAmount(
        String(value)
      );

      setError("");

      setMessage("");

    };


  /* =========================================================
     UI
  ========================================================= */

  return (

    <div className="add-money-overlay">

      <div className="add-money-modal">


        {/* =================================================
            HEADER
        ================================================= */}

        <div className="add-money-header">

          <div>

            <span className="add-money-label">
              ONLINEWALAA WALLET
            </span>

            <h2>
              Add Money
            </h2>

            <p>
              आपल्या wallet मध्ये पैसे add करा.
            </p>

          </div>


          {onClose && (

            <button
              type="button"
              className="add-money-close"
              onClick={
                onClose
              }
              disabled={
                loading
              }
              aria-label="Close"
            >
              ×
            </button>

          )}

        </div>


        {/* =================================================
            WALLET ICON
        ================================================= */}

        <div className="add-money-icon">
          💰
        </div>


        {/* =================================================
            AMOUNT
        ================================================= */}

        <div className="amount-section">

          <label htmlFor="walletAmount">
            Enter Amount
          </label>


          <div className="amount-input-wrapper">

            <span>
              ₹
            </span>

            <input
              id="walletAmount"
              type="number"
              min="10"
              max="50000"
              step="1"
              inputMode="numeric"
              placeholder="0"
              value={
                amount
              }
              disabled={
                loading
              }
              onChange={
                (e) => {

                  setAmount(
                    e.target.value
                  );

                  setError("");

                  setMessage("");

                }
              }
            />

          </div>


          <small>
            Minimum ₹10 • Maximum ₹50,000
          </small>

        </div>


        {/* =================================================
            QUICK AMOUNTS
        ================================================= */}

        <div className="preset-section">

          <label>
            Quick Add
          </label>


          <div className="preset-grid">

            {presetAmounts.map(
              (value) => (

                <button
                  key={
                    value
                  }
                  type="button"
                  disabled={
                    loading
                  }
                  className={
                    Number(
                      amount
                    ) === value
                      ? "selected"
                      : ""
                  }
                  onClick={
                    () =>
                      selectAmount(
                        value
                      )
                  }
                >

                  ₹
                  {value.toLocaleString(
                    "en-IN"
                  )}

                </button>

              )
            )}

          </div>

        </div>


        {/* =================================================
            PAYMENT METHOD
        ================================================= */}

        <div className="payment-method-section">

          <label>
            Payment Method
          </label>


          <div className="payment-method">

            <div className="payment-method-icon">
              UPI
            </div>


            <div className="payment-method-info">

              <strong>
                Razorpay
              </strong>

              <span>
                UPI • Cards • Net Banking
              </span>

            </div>


            <div className="payment-check">
              ✓
            </div>

          </div>

        </div>


        {/* =================================================
            ERROR
        ================================================= */}

        {error && (

          <div className="add-money-error">

            ⚠️ {error}

          </div>

        )}


        {/* =================================================
            SUCCESS / STATUS
        ================================================= */}

        {message && (

          <div className="add-money-success">

            ✓ {message}

          </div>

        )}


        {/* =================================================
            PAYMENT BUTTON
        ================================================= */}

        <button
          type="button"
          className="proceed-payment-btn"
          disabled={
            loading
          }
          onClick={
            handleAddMoney
          }
        >

          {loading ? (

            <>
              <span className="button-spinner"></span>

              Processing...
            </>

          ) : (

            <>
              💳 Continue to Payment
            </>

          )}

        </button>


        {/* =================================================
            SECURITY
        ================================================= */}

        <div className="payment-security">

          🔒 Secure payment powered by Razorpay

        </div>

      </div>

    </div>

  );

}


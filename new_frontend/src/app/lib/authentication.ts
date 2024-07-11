import {
  signUp,
  signIn,
  sendPasswordResetEmail,
  submitNewPassword,
} from "supertokens-web-js/recipe/emailpassword";
import {
  sendVerificationEmail,
  verifyEmail,
} from "supertokens-web-js/recipe/emailverification";
import Session from "supertokens-web-js/recipe/session";
import z from "zod";
import { languages } from "../i18n/settings";

const passwordValidator = z
  .string()
  .min(8, { message: "Password must be at least 8 characters long" })
  .regex(/[a-z]/, {
    message: "Password must contain at least one lowercase character",
  })
  .regex(/[0-9]/, { message: "Password must contain at least one number" });

//////////////////////////
// Authentication //
//////////////////////////

const FormSchemaSignUp = z.object({
  email: z.string({
    invalid_type_error: "Please enter a valid email address.",
  }),
  password: passwordValidator,
  language: z.string(),
});

export type State = {
  errors?: {
    email?: string[];
    password?: string[];
  };
  message?: string | null;
};

export async function signUpClicked(
  prevState: State | undefined | null,
  formData: FormData | string
) {
  switch (typeof formData) {
    case "string":
      switch (formData) {
        case "CLEAR_EMAIL_ERROR":
          return {
            errors: {
              ...prevState?.errors,
              email: undefined,
            },
            message: null,
          };
        case "CLEAR_PASSWORD_ERROR":
          return {
            errors: {
              ...prevState?.errors,
              password: undefined,
            },
            message: null,
          };
        default:
          return prevState;
      }
    case "object":
      const validatedFields = FormSchemaSignUp.safeParse({
        email: formData.get("email"),
        password: formData.get("password"),
        language: formData.get("language"),
      });

      if (!validatedFields.success) {
        return {
          errors: validatedFields.error.flatten().fieldErrors,
          message: "Missing Fields. Failed to Create Invoice.",
        };
      }

      console.log("validationField.data", validatedFields.data);

      const { email, password, language } = validatedFields.data;

      try {
        let response = await signUp({
          formFields: [
            {
              id: "email",
              value: email,
            },
            {
              id: "password",
              value: password,
            },
            {
              id: "language",
              value: language,
            },
          ],
        });

        if (response.status === "FIELD_ERROR") {
          // one of the input formFields failed validaiton
          let errorState = null;

          response.formFields.forEach((formField) => {
            if (formField.id === "email") {
              // Email validation failed (for example incorrect email syntax),
              // or the email is not unique.
              errorState = {
                errors: {
                  email: [formField.error],
                },
                message: "Failed to sign up.",
              };
            } else if (formField.id === "password") {
              // Password validation failed.
              // Maybe it didn't match the password strength
              errorState = {
                errors: {
                  password: [formField.error],
                },
                message: "Failed to sign up.",
              };
            }
          });
          return errorState;
        } else if (response.status === "SIGN_UP_NOT_ALLOWED") {
          // the reason string is a user friendly message
          // about what went wrong. It can also contain a support code which users
          // can tell you so you know why their sign up was not allowed.
          if (response.reason === "EMAIL_NOT_IN_WHITELIST") {
            return {
              errors: {
                email: [
                  "Thank you for your interest in Rockilus! We're " +
                    "currently in a private beta phase. We'll reach out to " +
                    "you soon.",
                ],
              },
              message: "Failed to sign up.",
            };
          }
          return {
            errors: {
              email: [response.reason],
            },
            message: "Failed to sign up.",
          };
        } else {
          // sign up successful. The session tokens are automatically handled by
          // the frontend SDK.
          window.location.href = "/";
        }
      } catch (err: any) {
        if (err.isSuperTokensGeneralError === true) {
          // this may be a custom error message sent from the API by you.
          window.alert(err.message);
        } else {
          window.alert("Oops! Something went wrong.");
        }
      }
      break;
    default:
      return { message: "Failed to sign up." };
  }
}

const FormSchemaSignIn = z.object({
  email: z.string({
    invalid_type_error: "Please enter a valid email address.",
  }),
  password: passwordValidator,
});

export async function signInClicked(
  prevState: State | undefined | null,
  formData: FormData | string
) {
  switch (typeof formData) {
    case "string":
      switch (formData) {
        case "CLEAR_EMAIL_ERROR":
          return {
            errors: {
              ...prevState?.errors,
              email: undefined,
            },
            message: null,
          };
        case "CLEAR_PASSWORD_ERROR":
          return {
            errors: {
              ...prevState?.errors,
              password: undefined,
            },
            message: null,
          };
        default:
          return prevState;
      }
    case "object":
      const validatedFields = FormSchemaSignIn.safeParse({
        email: formData.get("email"),
        password: formData.get("password"),
      });

      if (!validatedFields.success) {
        return {
          errors: validatedFields.error.flatten().fieldErrors,
          message: "Missing Fields. Failed to Create Invoice.",
        };
      }

      const { email, password } = validatedFields.data;

      try {
        let response = await signIn({
          formFields: [
            {
              id: "email",
              value: email,
            },
            {
              id: "password",
              value: password,
            },
          ],
        });

        if (response.status === "FIELD_ERROR") {
          let errorState: State | null = null;
          response.formFields.forEach((formField) => {
            if (formField.id === "email") {
              // Email validation failed (for example incorrect email syntax).
              errorState = {
                errors: {
                  email: [formField.error],
                },
                message: "Failed to sign in.",
              };
            }
          });
          return errorState;
        } else if (response.status === "WRONG_CREDENTIALS_ERROR") {
          return {
            errors: {
              password: ["Email password combination is incorrect."],
            },
            message: "Failed to sign in.",
          };
        } else if (response.status === "SIGN_IN_NOT_ALLOWED") {
          // the reason string is a user friendly message
          // about what went wrong. It can also contain a support code which users
          // can tell you so you know why their sign in was not allowed.
          window.alert(response.reason);
        } else {
          // sign in successful. The session tokens are automatically handled by
          // the frontend SDK.
          window.location.href = "/";
        }
      } catch (err: any) {
        if (err.isSuperTokensGeneralError === true) {
          // this may be a custom error message sent from the API by you.
          window.alert(err.message);
        } else {
          window.alert("Oops! Something went wrong.");
        }
      }
      break;
    default:
      return { message: "Failed to sign in." };
  }
}

//////////////////////////
// Verify email //
//////////////////////////

export async function sendEmail() {
  try {
    let response = await sendVerificationEmail();
    if (response.status === "EMAIL_ALREADY_VERIFIED_ERROR") {
      // This can happen if the info about email verification in the session was outdated.
      // Redirect the user to the home page
      return "alreadyVerified";
    } else {
      // email was sent successfully.
      return "success";
    }
  } catch (err: any) {
    return "error";
    // if (err.isSuperTokensGeneralError === true) {
    //   // this may be a custom error message sent from the API by you.
    //   // window.alert(err.message);
    //   console.log(err.message);
    // } else {
    //   // window.alert("Oops! Something went wrong.");
    //   console.log("Oops! Something went wrong.");
    //   throw err;
    // }
  }
}

export async function consumeVerificationCode() {
  try {
    let response = await verifyEmail();
    if (response.status === "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR") {
      // This can happen if the verification code is expired or invalid.
      // You should ask the user to retry

      return "invalidToken";
    } else {
      // email was verified successfully.
      return "success";
    }
  } catch (err: any) {
    return "error";
    //   if (err.isSuperTokensGeneralError === true) {
    //     // this may be a custom error message sent from the API by you.
    //   } else {
    //   }
  }
}

export async function checkAuthNSessionExist() {
  if (await Session.doesSessionExist()) {
    // user is logged in
    return true;
  } else {
    // user has not logged in yet
    return false;
  }
}

//////////////////////////
// Reset password //
//////////////////////////

const FormSchemaReset = z.object({
  email: z.string({
    invalid_type_error: "Please enter a valid email address.",
  }),
});

export type StateReset = {
  errors?: {
    email?: string[];
  };
  message?: string | null;
};

export async function sendEmailClicked(
  prevState: StateReset | undefined | null,
  formData: FormData | string
) {
  switch (typeof formData) {
    case "string":
      switch (formData) {
        case "CLEAR_EMAIL_ERROR":
          return {
            errors: {
              email: undefined,
            },
            message: null,
          };
        case "CLEAR_EMAIL_SUCCESS":
          return {
            errors: {
              email: undefined,
            },
            message: null,
          };
        default:
          return prevState;
      }
    case "object":
      const validatedFields = FormSchemaReset.safeParse({
        email: formData.get("email"),
      });

      if (!validatedFields.success) {
        return {
          errors: validatedFields.error.flatten().fieldErrors,
          message: "Missing Fields.",
        };
      }

      const { email } = validatedFields.data;

      try {
        let response = await sendPasswordResetEmail({
          formFields: [
            {
              id: "email",
              value: email,
            },
          ],
        });
        let errorState = null;
        if (response.status === "FIELD_ERROR") {
          response.formFields.forEach((formField) => {
            if (formField.id === "email") {
              // Email validation failed (for example incorrect email syntax).
              errorState = {
                errors: {
                  email: [formField.error],
                },
                message: "Failed to send reset password email.",
              };
            }
          });
          return errorState;
        } else if (response.status === "PASSWORD_RESET_NOT_ALLOWED") {
          // this can happen due to automatic account linking. Please read our account linking docs
          return {
            errors: {
              email: [response.reason],
            },
            message: "Failed to send reset password email.",
          };
        } else {
          // reset password email sent.
          return { message: "success" };
        }
      } catch (err: any) {
        if (err.isSuperTokensGeneralError === true) {
          // this may be a custom error message sent from the API by you.
          window.alert(err.message);
        } else {
          window.alert("Oops! Something went wrong.");
        }
      }

      break;
    default:
      return { message: "Failed to send reset password email." };
  }
}

const FormSchemaNewPassword = z
  .object({
    password: passwordValidator,
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Passwords do not match.",
    path: ["passwordConfirm"],
  });

export type StateNewPassword = {
  errors?: {
    password?: string[];
    passwordConfirm?: string[];
  };
  message?: string | null;
};

export async function newPasswordEntered(
  prevState: StateNewPassword | undefined | null,
  formData: FormData | string
) {
  switch (typeof formData) {
    case "string":
      switch (formData) {
        case "CLEAR_PASSWORD_ERROR":
          return {
            errors: {
              ...prevState?.errors,
              password: undefined,
            },
            message: null,
          };
        case "CLEAR_PASSWORD_CONFIRM_ERROR":
          return {
            errors: {
              ...prevState?.errors,
              passwordConfirm: undefined,
            },
            message: null,
          };
        default:
          return prevState;
      }
    case "object":
      const validatedFields = FormSchemaNewPassword.safeParse({
        password: formData.get("password"),
        passwordConfirm: formData.get("passwordConfirm"),
      });

      console.log("formData", formData);
      console.log("validatedFields", validatedFields);
      console.log("validatedFields.data", validatedFields.data);

      if (!validatedFields.success) {
        return {
          errors: validatedFields.error.flatten().fieldErrors,
          message: "Missing Fields.",
        };
      }
      const { password, passwordConfirm } = validatedFields.data;

      if (password !== passwordConfirm) {
        return {
          errors: {
            passwordConfirm: ["Passwords do not match."],
          },
          message: "Passwords do not match.",
        };
      }
      //   try {
      //     let response = await submitNewPassword({
      //       formFields: [
      //         {
      //           id: "password",
      //           value: newPassword,
      //         },
      //       ],
      //     });

      //     if (response.status === "FIELD_ERROR") {
      //       response.formFields.forEach((formField) => {
      //         if (formField.id === "password") {
      //           // New password did not meet password criteria on the backend.
      //           window.alert(formField.error);
      //         }
      //       });
      //     } else if (response.status === "RESET_PASSWORD_INVALID_TOKEN_ERROR") {
      //       // the password reset token in the URL is invalid, expired, or already consumed
      //       window.alert("Password reset failed. Please try again");
      //       window.location.assign("/auth"); // back to the login scree.
      //     } else {
      //       window.alert("Password reset successful!");
      //       window.location.assign("/auth");
      //     }
      //   } catch (err: any) {
      //     if (err.isSuperTokensGeneralError === true) {
      //       // this may be a custom error message sent from the API by you.
      //       window.alert(err.message);
      //     } else {
      //       window.alert("Oops! Something went wrong.");
      //     }
      //   }
      // }

      try {
        let response = await submitNewPassword({
          formFields: [
            {
              id: "password",
              value: password,
            },
          ],
        });
        let errorState = null;
        if (response.status === "FIELD_ERROR") {
          response.formFields.forEach((formField) => {
            if (formField.id === "password") {
              // New password did not meet password criteria on the backend.
              errorState = {
                errors: {
                  passwordConfirm: [formField.error],
                },
                message: "Failed to send change password.",
              };
            }
          });
        } else if (response.status === "RESET_PASSWORD_INVALID_TOKEN_ERROR") {
          // the password reset token in the URL is invalid, expired, or already consumed
          return {
            message: "invalidToken",
          };
        } else {
          // password changed.
          return { message: "success" };
        }
        return errorState;
      } catch (err: any) {
        if (err.isSuperTokensGeneralError === true) {
          // this may be a custom error message sent from the API by you.
          window.alert(err.message);
        } else {
          window.alert("Oops! Something went wrong.");
        }
      }

      break;
    default:
      return { message: "Failed to change password." };
  }
}

// async function newPasswordEntered(newPassword: string) {
//   try {
//     let response = await submitNewPassword({
//       formFields: [
//         {
//           id: "password",
//           value: newPassword,
//         },
//       ],
//     });

//     if (response.status === "FIELD_ERROR") {
//       response.formFields.forEach((formField) => {
//         if (formField.id === "password") {
//           // New password did not meet password criteria on the backend.
//           window.alert(formField.error);
//         }
//       });
//     } else if (response.status === "RESET_PASSWORD_INVALID_TOKEN_ERROR") {
//       // the password reset token in the URL is invalid, expired, or already consumed
//       window.alert("Password reset failed. Please try again");
//       window.location.assign("/auth"); // back to the login scree.
//     } else {
//       window.alert("Password reset successful!");
//       window.location.assign("/auth");
//     }
//   } catch (err: any) {
//     if (err.isSuperTokensGeneralError === true) {
//       // this may be a custom error message sent from the API by you.
//       window.alert(err.message);
//     } else {
//       window.alert("Oops! Something went wrong.");
//     }
//   }
// }

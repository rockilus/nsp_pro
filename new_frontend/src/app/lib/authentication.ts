import { signUp, signIn } from "supertokens-web-js/recipe/emailpassword";
import {
  sendVerificationEmail,
  verifyEmail,
} from "supertokens-web-js/recipe/emailverification";
import Session from "supertokens-web-js/recipe/session";
import z from "zod";

const FormSchema = z.object({
  email: z.string({
    invalid_type_error: "Please enter a valid email address.",
  }),
  password: z.string({
    invalid_type_error: "Please enter a valid password.",
  }),
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
      const validatedFields = FormSchema.safeParse({
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
          ],
        });

        console.log("response", response);

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
          window.alert(response.reason);
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
      const validatedFields = FormSchema.safeParse({
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
      console.log("default case");

      return { message: "Failed to sign in." };
  }
}

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

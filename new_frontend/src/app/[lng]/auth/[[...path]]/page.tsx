import { redirect } from "next/navigation";
// Components
import { getSSRSessionHelper } from "../../../../components/home";
import Auth from "../../../../components/user-authentication/auth";
import AuthSupertokens from "../../../../components/user-authentication/supertokens-auth-ui";

export default async function AuthPage({
  params: { lng },
}: {
  params: {
    lng: string;
  };
}) {
  const { accessTokenPayload, hasToken, error } = await getSSRSessionHelper();
  console.log("checking authentication in AuthPage:", hasToken);

  if (hasToken) {
    console.log("redirecting to /");

    // if (hasToken && emailVerified) {
    return redirect("/");
  }
  return <Auth lng={lng} />;
  // return <AuthSupertokens />;
}

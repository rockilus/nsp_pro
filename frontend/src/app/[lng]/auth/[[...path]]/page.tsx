import { redirect } from "next/navigation";
// Components
import { getSSRSessionHelper } from "../../../../components/home";
import Auth from "../../../../components/user-authentication/auth";
import AuthSupertokens from "../../../../components/user-authentication/supertokens-auth-ui";
// Constants
import { PostSignInRoute } from "../../../../constants/constants";
import { languages } from "../../../i18n/settings";

export async function generateStaticParams() {
  const paths: { lng: string; path?: string[] }[] = [];

  for (const lng of languages) {
    // Generate params for each language
    paths.push({ lng }); // Root auth path
    paths.push({ lng, path: [] }); // Empty path array
    paths.push({ lng, path: ["signin"] }); // Sign in
    paths.push({ lng, path: ["signup"] }); // Sign up
  }

  return paths;
}

export default async function AuthPage({
  params: { lng },
}: {
  params: {
    lng: string;
  };
}) {
  const { accessTokenPayload, hasToken, error } = await getSSRSessionHelper();
  // console.log("checking authentication in AuthPage:", hasToken);

  if (hasToken) {
    // console.log("redirecting to / from AuthPage");

    // if (hasToken && emailVerified) {
    return redirect(PostSignInRoute);
  }
  return <Auth lng={lng} />;
  // return <AuthSupertokens />;
}

import { languages } from "../../i18n/settings";
// Components
import NavAppBarAuth from "../../../components/user-authentication/nav-app-bar-auth";
// Styles
import "../../../styles/page.css";

export default function Layout({
  children,
  params: { lng },
}: {
  children: React.ReactNode;
  params: {
    lng: string;
  };
}) {
  return (
    <div style={{ overflow: "hidden", height: "100vh", background: "white" }}>
      <header>
        <NavAppBarAuth lng={lng} />
      </header>
      <main>{children}</main>
    </div>
  );
}

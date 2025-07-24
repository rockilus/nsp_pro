// import React, { useState, useEffect } from "react";
// import { useCookies } from "react-cookie";
// import { cookieName } from "../../app/i18n/settings";
// // Actions
// import { checkUserAuthz } from "../../app/lib/dashboard";

// interface DashboardHOCProps {
//   WrappedComponent: React.ComponentType<any>;
// }

// const DashboardHOC: React.FC<DashboardHOCProps> = ({
//   WrappedComponent,
//   ...props
// }) => {
//   const [userAuthorized, setUserAuthorized] = useState<boolean>(false);
//   const [cookies, setCookie] = useCookies([cookieName]);

//   useEffect(() => {
//     const checkAuthz = async () => {
//       try {
//         const isAuthorized = await checkUserAuthz();
//         if (isAuthorized) {
//           setUserAuthorized(true);
//         } else {
//           window.location.href = `/${cookies.i18next || "en"}/plan/workers`;
//         }
//       } catch (error) {
//         console.error("Failed to check user authz:", error);
//         window.location.href = `/${cookies.i18next || "en"}/plan/workers`;
//       }
//     };
//     checkAuthz();
//   }, [cookies.i18next]);

//   if (!userAuthorized) {
//     return null; // Render nothing while checking authorization
//   }

//   return <WrappedComponent {...props} />;
// };

// export default DashboardHOC;

import React, { useState, useEffect } from "react";
import { useCookies } from "react-cookie";
import { cookieName } from "../../app/i18n/settings";
// Hooks
import { useCheckUserAuthz } from "../../hooks/useDashboard";

interface DashboardHOCProps {
  WrappedComponent: React.ComponentType<any>;
}

const DashboardHOC = (WrappedComponent: React.ComponentType<any>) => {
  const WithAdminAuth: React.FC<any> = (props) => {
    const [userAuthorized, setUserAuthorized] = useState<boolean>(false);
    const [cookies] = useCookies([cookieName]);
    const checkUserAuthz = useCheckUserAuthz();

    useEffect(() => {
      const checkAuthz = async () => {
        try {
          const isAuthorized = await checkUserAuthz();
          if (isAuthorized) {
            setUserAuthorized(true);
          } else {
            window.location.href = `/${cookies.i18next || "en"}/plan/workers`;
          }
        } catch (error) {
          console.error("Failed to check user authz:", error);
          window.location.href = `/${cookies.i18next || "en"}/plan/workers`;
        }
      };
      checkAuthz();
    }, [cookies.i18next, checkUserAuthz]);

    if (!userAuthorized) {
      return null; // Render nothing while checking authorization
    }

    return <WrappedComponent {...props} />;
  };

  WithAdminAuth.displayName = `WithAdminAuth(${
    WrappedComponent.displayName || WrappedComponent.name || "Component"
  })`;

  return WithAdminAuth;
};

export default DashboardHOC;

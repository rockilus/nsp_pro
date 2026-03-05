/**
 * Navigation links for the admin section sidebar.
 * Add new admin sub-pages here as the section grows.
 */

export interface AdminLink {
  name: string;
  label: string;
  href: string;
}

export function getAdminLinks(lng: string): AdminLink[] {
  return [
    {
      name: "users",
      label: "Users",
      href: `/${lng}/admin/users`,
    },
  ];
}

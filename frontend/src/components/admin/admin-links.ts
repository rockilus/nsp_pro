/**
 * Navigation links for the admin section sidebar.
 * Add new admin sub-pages here as the section grows.
 */

export interface AdminLink {
  name: string;
  labelKey: string;
  href: string;
}

export function getAdminLinks(lng: string): AdminLink[] {
  return [
    {
      name: 'users',
      labelKey: 'usersLink',
      href: `/${lng}/admin/users`,
    },
    {
      name: 'import',
      labelKey: 'importLink',
      href: `/${lng}/admin/import`,
    },
  ];
}

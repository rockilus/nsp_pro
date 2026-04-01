/**
 * Shared configuration for settings navigation links.
 * Used by both SettingsPage and SettingsLayout to ensure consistency.
 */

export interface SettingsLink {
  name: string;
  label: string;
  href: string;
}

/**
 * Returns the settings navigation links configuration.
 * @param lng - The current language code
 * @param t - Translation function for profile-page namespace
 * @param tAppBar - Translation function for app-bar namespace
 * @returns Array of settings navigation links
 */
export function getSettingsLinks(
  lng: string,
  t: (key: string) => string,
  tAppBar: (key: string) => string,
): SettingsLink[] {
  return [
    {
      name: 'personal-info',
      label: t('personal_info'),
      href: `/${lng}/plan/settings/personal-info`,
    },
    {
      name: 'security',
      label: t('security_and_sign_in'),
      href: `/${lng}/plan/settings/security`,
    },
    {
      name: 'teams',
      label: tAppBar('teams'),
      href: `/${lng}/plan/settings/teams`,
    },
    {
      name: 'notifications',
      label: t('notifications'),
      href: `/${lng}/plan/settings/notifications`,
    },
  ];
}

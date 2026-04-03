import { useTranslation } from '../../app/i18n/client';
// Types
import { BlockNameOptions } from '../../types/constraint';

const GetBlockNameLabel = (lng: string, name: BlockNameOptions) => {
  const { t } = useTranslation(lng, 'constraint-page');

  const blockNameLabels: { name: BlockNameOptions; label: string }[] = [
    { name: BlockNameOptions.WORKER, label: t('worker') },
    { name: BlockNameOptions.SHIFT, label: t('shift') },
    { name: BlockNameOptions.SHIFT_REFERENCE, label: t('shift') },
    { name: BlockNameOptions.SHIFT_RELATIVE, label: t('shift') },
    { name: BlockNameOptions.OPERATOR, label: t('operator') },
    { name: BlockNameOptions.NUMBER, label: '#' },
    { name: BlockNameOptions.TIMING, label: t('timing') },
    { name: BlockNameOptions.WEEKDAY, label: t('week_day') },
  ];
  return blockNameLabels.find((item) => item.name === name)?.label || name.toString();
};

export default GetBlockNameLabel;

// Skeletons
import ScheduleSkeleton from '../../../../components/skeletons/schedule-skeleton';
// Styles
import '../../../../styles/tab-container-styles.css';

export default function Loading() {
  return (
    <div className="tab-container-ultrawide">
      <ScheduleSkeleton />
    </div>
  );
}

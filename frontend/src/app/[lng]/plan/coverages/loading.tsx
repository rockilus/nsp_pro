// Skeletons
import CoveragesSkeleton from "../../../../components/skeletons/coverages-skeleton";
// Styles
import "../../../../styles/tab-container-styles.css";

export default function Loading() {
  return (
    <div className="tab-container-ultrawide">
      <CoveragesSkeleton />
    </div>
  );
}

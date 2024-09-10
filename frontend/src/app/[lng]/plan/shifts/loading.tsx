// Skeletons
import TablesSkeleton from "../../../../components/skeletons/tables-skeleton";
// Styles
import "../../../../styles/tab-container-styles.css";

export default function Loading() {
  return (
    <div className="tab-container-wide">
      <TablesSkeleton numTables={2} numInternalRows={3} />
    </div>
  );
}

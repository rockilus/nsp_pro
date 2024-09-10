// Skeletons
import TablesSkeleton from "../../../../components/skeletons/tables-skeleton";
// Styles
import "../../../../styles/tab-container-styles.css";

export default function Loading() {
  return (
    <div className="tab-container">
      <TablesSkeleton numTables={3} numInternalRows={3} />
    </div>
  );
}

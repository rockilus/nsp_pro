import TablesSkeleton from "../../../../components/skeletons/tables-skeleton";

export default function Loading() {
  // You can add any UI inside Loading, including a Skeleton.
  return <TablesSkeleton numTables={1} numInternalRows={3} />;
}

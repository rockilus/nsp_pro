import { useState, useEffect } from "react";

export const useTableHeight = (isFilterToolbarActive: boolean) => {
  const [tableHeight, setTableHeight] = useState("70vh");

  useEffect(() => {
    const calculateHeight = () => {
      const viewportHeight = window.innerHeight;
      const headerHeight = 65;
      const titleContainerHeight = 47;
      const filterToolbarHeight = isFilterToolbarActive ? 80 : 0;
      const paddingAndMargins = 40;

      const availableHeight =
        viewportHeight -
        headerHeight -
        titleContainerHeight -
        filterToolbarHeight -
        paddingAndMargins;
      const maxHeight = Math.max(
        300,
        Math.min(availableHeight, viewportHeight)
      );

      setTableHeight(`${maxHeight}px`);
    };

    calculateHeight();
    window.addEventListener("resize", calculateHeight);
    return () => window.removeEventListener("resize", calculateHeight);
  }, [isFilterToolbarActive]);

  return tableHeight;
};

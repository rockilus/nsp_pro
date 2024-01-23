import React, { useState } from "react";

import ConstraintEdit from "./ConstraintEdit";
import TemplateList from "./TemplateList";
import { ConstraintTemplateT } from "./types";

interface Props {
  constraintTemplates: ConstraintTemplateT[];
}

export default function NewConstraintNew({ constraintTemplates }: Props) {
  const [selectedTemplate, setSelectedTemplate] =
    useState<ConstraintTemplateT | null>(null);

  const handleSelectedTemplate = (ct: ConstraintTemplateT) => {
    setSelectedTemplate(ct);
  };

  return (
    <div>
      {selectedTemplate ? (
        <ConstraintEdit
          constraint={{
            id: "",
            constraintType: selectedTemplate.constraintType,
            blocks: [],
            hard: true,
            priority: "medium",
            active: true,
          }}
          constraintTemplate={selectedTemplate}
        />
      ) : (
        <div>Select constraint template in list below.</div>
      )}
      <TemplateList
        constraintTemplates={constraintTemplates}
        selectedTemplate={selectedTemplate}
        handleSelectedTemplate={handleSelectedTemplate}
      />
    </div>
  );
}

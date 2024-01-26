import React, { useState } from "react";

import ConstraintEdit from "./ConstraintEdit";
import TemplateList from "./TemplateList";
import { TemplateT } from "./types";

interface Props {
  constraintTemplates: TemplateT[];
}

export default function NewConstraint({ constraintTemplates }: Props) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateT | null>(
    null
  );

  const handleSelectedTemplate = (ct: TemplateT) => {
    setSelectedTemplate(ct);
  };

  return (
    <div>
      {selectedTemplate ? (
        <ConstraintEdit
          constraint={{
            id: "",
            constraintType: selectedTemplate.constraintType,
            templateId: selectedTemplate.id,
            blocks: [],
            text: "",
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

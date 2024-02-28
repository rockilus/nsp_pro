import React, { useState } from "react";
// Components
import ConstraintEdit from "./ConstraintEdit";
import TemplateList from "./TemplateList";
// Types
import { TemplateT } from "./types";
import { TeamT } from "../../containers/types";

interface Props {
  team: TeamT;
  constraintTemplates: TemplateT[];
}

export default function NewConstraint({ team, constraintTemplates }: Props) {
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
            teamId: team.id,
            constraintType: selectedTemplate.constraintType,
            templateId: selectedTemplate.id,
            blocks: [],
            text: "",
            hard: true,
            priority: "medium",
            active: true,
            missingProperties: [],
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

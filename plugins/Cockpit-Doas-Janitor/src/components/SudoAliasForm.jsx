// src/components/SudoAliasForm.jsx
import React, { useState } from "react";
import {
  Form,
  FormGroup,
  TextInput,
  Button,
  FormSelect,
  FormSelectOption,
} from "@patternfly/react-core";

export function SudoAliasForm({ catalog, onSave, onCancel, initialData = null }) {
  const [aliasType, setAliasType] = useState(initialData?.type || "");
  const [aliasName, setAliasName] = useState(initialData?.name || "");
  const [members, setMembers] = useState(
    initialData?.members ? initialData.members.join("\n") : ""
  );

  const aliasTypes = [
    { value: "", label: "Select alias type" },
    { value: "User_Alias", label: "User Alias" },
    { value: "Runas_Alias", label: "Runas Alias" },
    { value: "Host_Alias", label: "Host Alias" },
    { value: "Cmnd_Alias", label: "Command Alias" },
  ];

  const handleSave = () => {
    const memberList = members
      .split("\n")
      .map((m) => m.trim())
      .filter((m) => m.length > 0);

    const data = {
      type: aliasType,
      name: aliasName,
      members: memberList,
    };
    onSave(data);
  };

  return (
    <div style={{ padding: "1rem" }}>
      <Form>
        <FormGroup label="Alias type" isRequired>
          <FormSelect
            value={aliasType}
            onChange={(e, val) => setAliasType(val)}
            aria-label="Alias type"
          >
            {aliasTypes.map((option) => (
              <FormSelectOption
                key={option.value}
                value={option.value}
                label={option.label}
                isDisabled={option.value === ""}
              />
            ))}
          </FormSelect>
        </FormGroup>

        <FormGroup label="Alias name" isRequired>
          <TextInput
            value={aliasName}
            onChange={(e, val) => setAliasName(val)}
            placeholder="ALIAS_NAME"
            isRequired
          />
        </FormGroup>

        <FormGroup label="Members" isRequired>
          <textarea
            style={{
              width: "100%",
              minHeight: "150px",
              padding: "0.5rem",
              border: "1px solid var(--pf-v6-global--BorderColor--100)",
              borderRadius: "3px",
              backgroundColor: "var(--pf-v6-global--BackgroundColor--dark-100, #1b1d21)",
              color: "var(--pf-v6-global--Color--100)",
              fontFamily: "var(--pf-v6-global--FontFamily--monospace)",
              fontSize: "0.875rem",
              resize: "vertical",
            }}
            value={members}
            onChange={(e) => setMembers(e.target.value)}
            placeholder="Enter one member per line&#10;e.g., user1&#10;user2&#10;%group1"
          />
          <div
            style={{
              fontSize: "0.875rem",
              marginTop: "0.5rem",
              color: "var(--pf-v6-global--Color--200)",
            }}
          >
            Enter one member per line. For User/Runas aliases: use usernames or
            %groupnames. For Host aliases: use hostnames or IP addresses. For
            Command aliases: use full command paths.
          </div>
        </FormGroup>

        <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.5rem" }}>
          <Button variant="primary" onClick={handleSave} isDisabled={!aliasType || !aliasName}>
            Save
          </Button>
          <Button variant="link" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </Form>
    </div>
  );
}

// components/SudoForm.jsx
import React, { useState, useEffect } from "react";
import {
  Form,
  FormGroup,
  TextInput,
  Checkbox,
  Button,
  Select,
  SelectOption,
  SelectVariant,
} from "@patternfly/react-core";
import { getCategorizedCommands } from "../utils/catalog";

export function SudoUserForm({ catalog, onSave, onCancel, initialData = null }) {
  const [user, setUser] = useState(initialData?.user || "");
  const [runAs, setRunAs] = useState(initialData?.runas || "root");
  const [allowAll, setAllowAll] = useState(initialData?.all || false);
  const [selectedCommands, setSelectedCommands] = useState(initialData?.commands || []);
  const [nopasswd, setNopasswd] = useState(initialData?.nopasswd || false);
  const [noexec, setNoexec] = useState(initialData?.noexec || false);
  const [setenv, setSetenv] = useState(initialData?.setenv || false);
  const [logInput, setLogInput] = useState(initialData?.log_input || false);
  const [logOutput, setLogOutput] = useState(initialData?.log_output || false);
  
  const [runAsOpen, setRunAsOpen] = useState(false);
  const [commandsOpen, setCommandsOpen] = useState(false);
  
  // Common run-as aliases
  const runAsOptions = ["root", "ALL", "www-data", "postgres", "mysql", "nobody"];
  
  const categorizedCommands = getCategorizedCommands(catalog || {});
  
  const handleSave = () => {
    const data = {
      user,
      runas: runAs,
      all: allowAll,
      commands: allowAll ? [] : selectedCommands,
      nopasswd,
      noexec,
      setenv,
      log_input: logInput,
      log_output: logOutput,
    };
    onSave(data);
  };
  
  return (
    <Form>
      <FormGroup label="User" isRequired>
        <TextInput
          value={user}
          onChange={(e, val) => setUser(val)}
          placeholder="username"
          isRequired
        />
      </FormGroup>
      
      <FormGroup label="Run as">
        <Select
          variant={SelectVariant.single}
          onToggle={(isOpen) => setRunAsOpen(isOpen)}
          onSelect={(e, selection) => {
            setRunAs(selection);
            setRunAsOpen(false);
          }}
          selections={runAs}
          isOpen={runAsOpen}
        >
          {runAsOptions.map(option => (
            <SelectOption key={option} value={option}>
              {option}
            </SelectOption>
          ))}
        </Select>
      </FormGroup>
      
      <FormGroup>
        <Checkbox
          id="allow-all"
          label="Allow ALL"
          isChecked={allowAll}
          onChange={(e, checked) => setAllowAll(checked)}
        />
      </FormGroup>
      
      {!allowAll && (
        <FormGroup label="Commands" isRequired={!allowAll}>
          <Select
            variant={SelectVariant.typeaheadMulti}
            onToggle={(isOpen) => setCommandsOpen(isOpen)}
            onSelect={(e, selection) => {
              if (selectedCommands.includes(selection)) {
                setSelectedCommands(selectedCommands.filter(s => s !== selection));
              } else {
                setSelectedCommands([...selectedCommands, selection]);
              }
            }}
            selections={selectedCommands}
            isOpen={commandsOpen}
            placeholderText="Select commands..."
            isGrouped
          >
            {categorizedCommands.map(({ category, options }) => (
              <SelectOption
                key={category}
                isGroupTitle
                groupLabel={category}
              >
                {options.map(opt => (
                  <SelectOption key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectOption>
                ))}
              </SelectOption>
            ))}
          </Select>
        </FormGroup>
      )}
      
      <FormGroup>
        <Checkbox
          id="nopasswd"
          label="No password required (NOPASSWD)"
          isChecked={nopasswd}
          onChange={(e, checked) => setNopasswd(checked)}
        />
      </FormGroup>
      
      <FormGroup label="Advanced options">
        <Checkbox
          id="noexec"
          label="Prevent shell escape (NOEXEC)"
          isChecked={noexec}
          onChange={(e, checked) => setNoexec(checked)}
        />
        <Checkbox
          id="setenv"
          label="Allow environment variables (SETENV)"
          isChecked={setenv}
          onChange={(e, checked) => setSetenv(checked)}
        />
        <Checkbox
          id="log-input"
          label="Log input"
          isChecked={logInput}
          onChange={(e, checked) => setLogInput(checked)}
        />
        <Checkbox
          id="log-output"
          label="Log output"
          isChecked={logOutput}
          onChange={(e, checked) => setLogOutput(checked)}
        />
      </FormGroup>
    </Form>
  );
}

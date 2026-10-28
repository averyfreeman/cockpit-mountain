// src/components/SudoUserForm.jsx
import React, { useState } from "react";
import {
  Form,
  FormGroup,
  TextInput,
  Checkbox,
  Button,
  FormSelect,
  FormSelectOption,
} from "@patternfly/react-core";
import { getCategorizedCommands } from "../utils/catalog";

export function SudoUserForm({ catalog, onSave, onCancel, initialData = null }) {
  const [user, setUser] = useState(initialData?.user || "");
  const [runAs, setRunAs] = useState(initialData?.runas || "root");
  const [allowAll, setAllowAll] = useState(initialData?.all || false);
  const [selectedCommands, setSelectedCommands] = useState(
    initialData?.commands || []
  );
  const [customCommands, setCustomCommands] = useState(
    initialData?.custom_commands || ""
  );
  const [nopasswd, setNopasswd] = useState(initialData?.nopasswd || false);
  const [noexec, setNoexec] = useState(initialData?.noexec || false);
  const [setenv, setSetenv] = useState(initialData?.setenv || false);
  const [logInput, setLogInput] = useState(initialData?.log_input || false);
  const [logOutput, setLogOutput] = useState(initialData?.log_output || false);

  // Common run-as aliases
  const runAsOptions = ["root", "ALL", "www-data", "postgres", "mysql", "nobody"];

  // Build command options from catalog
  const commandOptions = [];
  if (catalog) {
    Object.entries(catalog).forEach(([category, section]) => {
      // Add aliases
      Object.keys(section.command_aliases || {}).forEach((alias) => {
        commandOptions.push({ value: alias, label: `${alias} (${category})` });
      });
      // Add raw commands
      (section.raw_commands || []).forEach((cmd) => {
        commandOptions.push({ value: cmd, label: `${cmd} (${category})` });
      });
    });
  }

  const categorizedCommands = getCategorizedCommands(catalog || {});

  const handleSave = () => {
    const data = {
      user,
      runas: runAs,
      all: allowAll,
      commands: allowAll ? [] : selectedCommands,
      custom_commands: allowAll ? [] : customCommands.split("\n").map(c => c.trim()).filter(c => c),
      nopasswd,
      noexec,
      setenv,
      log_input: logInput,
      log_output: logOutput,
    };
    onSave(data);
  };

  return (
    <div style={{ padding: "1rem" }}>
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
          <FormSelect
            value={runAs}
            onChange={(e, val) => setRunAs(val)}
            aria-label="Run as"
          >
            {runAsOptions.map((option) => (
              <FormSelectOption key={option} value={option} label={option} />
            ))}
          </FormSelect>
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
          <FormGroup label="Commands" isRequired>
            <select
              multiple
              disabled={allowAll}
              style={{
                width: "100%",
                minHeight: "200px",
                padding: "0.5rem",
                border: "1px solid var(--pf-v6-global--BorderColor--100)",
                borderRadius: "3px",
                backgroundColor: "var(--pf-v6-global--BackgroundColor--dark-100, #1b1d21)",
                color: "var(--pf-v6-global--Color--100)",
              }}
              value={selectedCommands}
              onChange={(e) => {
                const options = Array.from(e.target.selectedOptions);
                setSelectedCommands(options.map((o) => o.value));
              }}
            >
              {categorizedCommands.map(({ category, options }) => (
                <optgroup key={category} label={category}>
                  {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <div style={{ fontSize: "0.875rem", marginTop: "0.5rem", color: "var(--pf-v6-global--Color--200)" }}>
              Hold Ctrl/Cmd to select multiple
            </div>
          </FormGroup>
        )}

        {!allowAll && (
          <FormGroup label="Custom commands">
            <textarea
              style={{
                width: "100%",
                minHeight: "100px",
                padding: "0.5rem",
                border: "1px solid var(--pf-v6-global--BorderColor--100)",
                borderRadius: "3px",
                backgroundColor: "var(--pf-v6-global--BackgroundColor--dark-100, #1b1d21)",
                color: "var(--pf-v6-global--Color--100)",
                fontFamily: "var(--pf-v6-global--FontFamily--monospace)",
                fontSize: "0.875rem",
                resize: "vertical",
              }}
              value={customCommands}
              onChange={(e) => setCustomCommands(e.target.value)}
              placeholder="Enter custom commands (one per line)&#10;e.g., /usr/bin/systemctl restart myapp&#10;/usr/local/bin/deploy.sh"
            />
            <div
              style={{
                fontSize: "0.875rem",
                marginTop: "0.5rem",
                color: "var(--pf-v6-global--Color--200)",
              }}
            >
              Custom commands will be added to /etc/sudoers.d/commands.local
            </div>
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

        <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.5rem" }}>
          <Button variant="primary" onClick={handleSave}>
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

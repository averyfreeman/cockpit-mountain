/*
 * src/app.jsx
 * Cockpit-native React UI
 */

import React, { useEffect, useState } from "react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Spinner,
  Alert,
  Modal,
  ModalVariant,
  Button,
} from "@patternfly/react-core";

import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
} from "@patternfly/react-table";

import {
  Dropdown as PFDropdown,
  DropdownList,
  DropdownItem as PFDropdownItem,
  MenuToggle,
} from '@patternfly/react-core';

import EllipsisVIcon from '@patternfly/react-icons/dist/esm/icons/ellipsis-v-icon';

import { spawnBackend } from "./utils/backend";
import { loadCommandCatalog } from "./utils/catalog";
import { SudoUserForm } from "./components/SudoUserForm";
import { SudoGroupForm } from "./components/SudoGroupForm";
import { SudoAliasForm } from "./components/SudoAliasForm";

/* -------------------------
 * Simple dropdown (Cockpit-safe)
 * ------------------------- */

function Dropdown({ label, children }) {
  const [open, setOpen] = useState(false);

  return (
    <PFDropdown
      isOpen={open}
      onSelect={() => setOpen(false)}
      onOpenChange={(isOpen) => setOpen(isOpen)}
      toggle={(toggleRef) => (
        <MenuToggle
          ref={toggleRef}
          onClick={() => setOpen(!open)}
          isExpanded={open}
          variant="primary"
        >
          {label}
        </MenuToggle>
      )}
    >
      <DropdownList>
        {React.Children.map(children, (child) => {
          if (!child) return null;

          // Clone child to add the close handler
          return React.cloneElement(child, {
            onClick: () => {
              child.props.onClick?.();
              setOpen(false);
            }
          });
        })}
      </DropdownList>
    </PFDropdown>
  );
}

function DropdownItem({ onClick, onSelect, children }) {
  return (
    <li>
      <button
        type="button"
        className="sudo-dropdown-item"
        onClick={() => {
          onSelect?.();
          onClick?.();
        }}
      >
        {children}
      </button>
    </li>
  );
}

/* -------------------------
 * Table row actions
 * ------------------------- */

function RowActions({ onEdit, onDelete }) {
  const [open, setOpen] = useState(false);

  return (
    <PFDropdown
      isOpen={open}
      onSelect={() => setOpen(false)}
      onOpenChange={(isOpen) => setOpen(isOpen)}
      toggle={(toggleRef) => (
        <MenuToggle
          ref={toggleRef}
          onClick={() => setOpen(!open)}
          isExpanded={open}
          variant="plain"
          aria-label="Actions"
        >
          <EllipsisVIcon />
        </MenuToggle>
      )}
      popperProps={{ position: "right" }}
    >
      <DropdownList>
        <PFDropdownItem onClick={() => { onEdit(); setOpen(false); }}>
          Edit
        </PFDropdownItem>
        <PFDropdownItem onClick={() => { onDelete(); setOpen(false); }}>
          Delete
        </PFDropdownItem>
      </DropdownList>
    </PFDropdown>
  );
}

/* -------------------------
 * Rules table
 * ------------------------- */

function RulesTable({ rules, onEdit, onDelete }) {
  return (
    <Table variant="compact">
      <Thead>
        <Tr>
          <Th width={15}>User</Th>
          <Th width={60}>Commands</Th>
          <Th width={15}>NOPASSWD</Th>
          <Th width={10} />
        </Tr>
      </Thead>
      <Tbody>
        {rules.map((rule, index) => (
          <Tr key={`${rule.user}-${index}`}>
            <Td dataLabel="User">{rule.user}</Td>
            <Td dataLabel="Commands" className="sudo-commands">
              {rule.all
                ? "ALL"
                : rule.commands.map((cmd, idx) => {
                    if (typeof cmd === "string") {
                      // Raw command
                      return <span key={`${cmd}-${idx}`}>{cmd}</span>;
                    } else {
                      // Command alias with tooltip
                      return (
                        <span
                          key={`${cmd.name}-${idx}`}
                          className="sudo-alias"
                          title={cmd.commands?.join("\n") || ""}
                        >
                          {cmd.name}
                        </span>
                      );
                    }
                  })}
            </Td>
            <Td dataLabel="NOPASSWD">{rule.nopasswd ? "Yes" : "No"}</Td>
            <Td isActionCell>
              <RowActions
                onEdit={() => onEdit(rule)}
                onDelete={() => onDelete(rule)}
              />
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}

/* -------------------------
 * Application
 * ------------------------- */

export default function Application() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null);
  const [catalog, setCatalog] = useState({});
  const [editingRule, setEditingRule] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const cat = await loadCommandCatalog();
        setCatalog(cat);
        const out = await spawnBackend(["list"]);
        setRules(JSON.parse(out) || []);
        setLoading(false);
      } catch (err) {
        setError("Failed to load sudo rules");
        setLoading(false);
        console.error(err);
      }
    })();
  }, []);

  const modalTitles = {
    user: editingRule ? "Edit Sudo User" : "Add Sudo User",
    group: editingRule ? "Edit Sudo Group" : "Add Sudo Group",
    alias: editingRule ? "Edit Alias" : "Add Alias",
  };

  const handleSaveUser = async (data) => {
    try {
      console.log("Saving user data:", data);

      await spawnBackend(["update-json", JSON.stringify(data)]);

      // Reload rules
      const out = await spawnBackend(["list"]);
      setRules(JSON.parse(out) || []);

      // Close modal
      setModal(null);
      setEditingRule(null);
      setError(null); // Clear any previous errors
    } catch (err) {
      console.error("Failed to save:", err);
      const errorMsg = err.message || err.toString();
      setError(`Failed to save sudo rule: ${errorMsg}`);
    }
  };

  const handleSaveGroup = async (data) => {
    try {
      console.log("Saving group data:", data);

      await spawnBackend(["update-group-json", JSON.stringify(data)]);

      const out = await spawnBackend(["list"]);
      setRules(JSON.parse(out) || []);

      setModal(null);
      setEditingRule(null);
      setError(null);
    } catch (err) {
      console.error("Failed to save:", err);
      const errorMsg = err.message || err.toString();
      setError(`Failed to save sudo group: ${errorMsg}`);
    }
  };

  const handleSaveAlias = async (data) => {
    try {
      console.log("Saving alias data:", data);

      await spawnBackend(["add-alias-json", JSON.stringify(data)]);

      const out = await spawnBackend(["list"]);
      setRules(JSON.parse(out) || []);

      setModal(null);
      setEditingRule(null);
      setError(null);
    } catch (err) {
      console.error("Failed to save:", err);
      const errorMsg = err.message || err.toString();
      setError(`Failed to save sudo alias: ${errorMsg}`);
    }
  };

  const handleEdit = (rule) => {
    // Transform commands back to their original format for editing
    // Convert command objects (aliases) back to just their names
    // Keep raw commands as strings
    const editData = {
      ...rule,
      commands: rule.commands.map(cmd => 
        typeof cmd === "string" ? cmd : cmd.name
      ),
    };
    setEditingRule(editData);
    setModal("user");
  };

  const handleDelete = async (rule) => {
    // Check if it's a group (starts with %)
    const isGroup = rule.user.startsWith("%");
    const displayName = isGroup ? rule.user : rule.user;
  
    if (!confirm(`Delete sudo rule for ${displayName}?`)) return;

    try {
      if (isGroup) {
        // It's a group - use delete-group-json
        const groupName = rule.user.substring(1); // Remove % prefix
        await spawnBackend(["delete-group-json", JSON.stringify({ group: groupName })]);
      } else {
        // It's a user - use delete-json
        await spawnBackend(["delete-json", JSON.stringify({ user: rule.user })]);
      }
    
      const out = await spawnBackend(["list"]);
      setRules(JSON.parse(out) || []);
      setError(null);
    } catch (err) {
      console.error("Failed to delete:", err);
      const errorMsg = err.message || err.toString();
      setError(`Failed to delete sudo rule: ${errorMsg}`);
    }
  };

  const handleCloseModal = () => {
    setModal(null);
    setEditingRule(null);
  };

  return (
    <>
      <Card>
        <CardHeader
          actions={{
            actions: (
              <Dropdown label="Add">
                <DropdownItem onClick={() => setModal("user")}>
                  Add Sudo User
                </DropdownItem>
                <DropdownItem onClick={() => setModal("group")}>
                  Add Sudo Group
                </DropdownItem>
                <DropdownItem onClick={() => setModal("alias")}>
                  Add Sudo Alias
                </DropdownItem>
              </Dropdown>
            ),
          }}
        >
          <CardTitle>Sudo Manager</CardTitle>
        </CardHeader>

        <CardBody>
          {loading && <Spinner size="xl" />}
          {error && (
            <Alert
              variant="danger"
              title={error}
              isInline
              actionClose={<Button variant="plain" onClick={() => setError(null)}>×</Button>}
            />
          )}
          {!loading && !error && (
            <RulesTable
              rules={rules}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        </CardBody>
      </Card>

      <Modal
        variant={ModalVariant.medium}
        title={modal ? modalTitles[modal] : ""}
        isOpen={!!modal}
        onClose={handleCloseModal}
        appendTo={() => document.body}
        disableFocusTrap
      >
        {modal === "user" && (
          <SudoUserForm
            catalog={catalog}
            initialData={editingRule}
            onSave={handleSaveUser}
            onCancel={handleCloseModal}
          />
        )}
        {modal === "group" && (
          <SudoGroupForm
            catalog={catalog}
            initialData={editingRule}
            onSave={handleSaveGroup}
            onCancel={handleCloseModal}
          />
        )}
        {modal === "alias" && (
          <SudoAliasForm
            catalog={catalog}
            initialData={editingRule}
            onSave={handleSaveAlias}
            onCancel={handleCloseModal}
          />
        )}
      </Modal>
    </>
  );
}

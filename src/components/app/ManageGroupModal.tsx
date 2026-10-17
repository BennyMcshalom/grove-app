"use client";

import { useState, useTransition } from "react";
import { Avatar } from "@/components/app/Avatar";
import { ConfirmDialog } from "@/components/app/bonds/ConfirmDialog";
import { FIELD, Labelled } from "@/components/app/CreateGroupModal";
import { useToast } from "@/components/app/ToastProvider";
import { FormError } from "@/components/auth/FormError";
import { Button } from "@/components/ui/Button";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import {
  removeGroupMember,
  requestGroupDeletion,
  setGroupMemberRole,
  updateGroupDetails,
} from "@/app/(app)/groups/actions";
import { cn } from "@/lib/cn";
import type { Group, GroupMember } from "@/lib/groups";

const SECTIONS = ["Details", "Members", "Delete group"] as const;

/**
 * Manage group (admins). No Figma frame; built from the create-group form's
 * pieces. Details and who can join, the art and colour, members and
 * co-admins, and deleting, which goes to Grouv support rather than happening
 * on one tap. The group's creator always stays an admin and can't be removed.
 */
export function ManageGroupModal({
  group,
  members,
  deletionRequestedAt,
  viewerId,
  onEditLook,
  onClose,
}: {
  group: Group;
  members: GroupMember[];
  /** Support was already asked to delete it (still open). */
  deletionRequestedAt: string | null;
  viewerId: string;
  onEditLook: () => void;
  onClose: () => void;
}) {
  const [section, setSection] = useState<(typeof SECTIONS)[number]>("Details");

  return (
    <Modal label="Manage group" onClose={onClose}>
      <ModalHeader title="Manage group" onClose={onClose} />
      <div role="tablist" className="flex border-b border-ink-50">
        {SECTIONS.map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={s === section}
            onClick={() => setSection(s)}
            className={cn(
              "-mb-px h-10 flex-1 border-b-2 px-2 font-sans text-sm font-medium transition-colors",
              s === section ? "border-primary-600 text-ink-800" : "border-transparent text-ink-400 hover:text-ink-600",
            )}
          >
            {s === "Members" ? `Members (${members.length})` : s}
          </button>
        ))}
      </div>
      {section === "Details" && <Details group={group} onEditLook={onEditLook} />}
      {section === "Members" && <Members groupId={group.id} members={members} viewerId={viewerId} />}
      {section === "Delete group" && <DeleteGroup group={group} requestedAt={deletionRequestedAt} />}
    </Modal>
  );
}

function Details({ group, onEditLook }: { group: Group; onEditLook: () => void }) {
  const toast = useToast();
  const [title, setTitle] = useState(group.title);
  const [label, setLabel] = useState(group.label ?? "");
  const [description, setDescription] = useState(group.description ?? "");
  const [joinPolicy, setJoinPolicy] = useState(group.joinPolicy);
  const [error, setError] = useState<string>();
  const [saving, start] = useTransition();

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        setError(undefined);
        start(async () => {
          const result = await updateGroupDetails(group.id, { title, label, description, joinPolicy });
          if (result.error) return setError(result.error);
          toast({ title: "Group updated" });
        });
      }}
    >
      <Labelled label="Group name">
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} required className={FIELD} />
      </Labelled>
      <Labelled label="Label">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={60}
          placeholder="e.g The first year"
          className={FIELD}
        />
      </Labelled>
      <Labelled label="What’s this group for?">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={1000}
          rows={4}
          className={cn(FIELD, "resize-none")}
        />
      </Labelled>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 font-sans text-sm font-medium text-ink-500">Who can join</legend>
        {(
          [
            ["approval", "Admins approve each request", "People ask to join; you or a co-admin say yes."],
            ["open", "Anyone in the Space can join", "No approval needed."],
          ] as const
        ).map(([value, name, hint]) => (
          <label
            key={value}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-lg border p-3",
              joinPolicy === value ? "border-primary-300 bg-primary-50" : "border-ink-50",
            )}
          >
            <input
              type="radio"
              name="join-policy"
              checked={joinPolicy === value}
              onChange={() => setJoinPolicy(value)}
              className="mt-1 accent-primary-600"
            />
            <span className="flex flex-col">
              <span className="font-sans text-sm font-medium text-ink-700">{name}</span>
              <span className="font-sans text-xs text-ink-400">{hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <button
        type="button"
        onClick={onEditLook}
        className="w-fit font-sans text-sm font-medium text-primary-600 underline-offset-2 hover:underline"
      >
        Change the group&rsquo;s art and colour
      </button>

      <div className="flex flex-col gap-3 border-t border-ink-50 pt-5">
        <FormError message={error} />
        <Button type="submit" size="sm" fullWidth loading={saving}>
          Save changes
        </Button>
      </div>
    </form>
  );
}

function Members({ groupId, members, viewerId }: { groupId: string; members: GroupMember[]; viewerId: string }) {
  const toast = useToast();
  const [busy, start] = useTransition();
  const [removing, setRemoving] = useState<GroupMember | null>(null);

  const run = (action: () => Promise<{ error?: string }>, done: string) =>
    start(async () => {
      const result = await action();
      toast(result.error ? { title: result.error, tone: "danger" } : { title: done });
    });

  return (
    <div className="flex flex-col gap-3">
      <p className="font-sans text-sm text-ink-400">
        Co-admins can edit the group, approve requests and remove members. The person who started the group always
        stays an admin.
      </p>
      <ul className="flex flex-col divide-y divide-ink-50">
        {members.map((m) => {
          const me = m.userId === viewerId;
          return (
            <li key={m.userId} className="flex items-center gap-3 py-3">
              <Avatar src={m.avatarUrl} name={m.name} sizes="36px" className="size-9 shrink-0" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-sans text-sm font-medium text-ink-700">
                  {m.name}
                  {me && <span className="font-normal text-ink-400"> (you)</span>}
                </span>
                <span className="font-sans text-xs text-ink-400">
                  {m.isCreator ? "Started the group · Admin" : m.role === "admin" ? "Co-admin" : "Member"}
                </span>
              </span>
              {!m.isCreator && !me && (
                <span className="flex shrink-0 items-center gap-3">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      run(
                        () => setGroupMemberRole(groupId, m.userId, m.role === "admin" ? "member" : "admin"),
                        m.role === "admin" ? `${m.name} is a member now` : `${m.name} is a co-admin now`,
                      )
                    }
                    className="font-sans text-sm font-medium text-primary-600 hover:underline disabled:opacity-50"
                  >
                    {m.role === "admin" ? "Remove admin" : "Make admin"}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setRemoving(m)}
                    className="font-sans text-sm font-medium text-destructive-60 hover:underline disabled:opacity-50"
                  >
                    Remove
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {removing && (
        <ConfirmDialog
          title={`Remove ${removing.name}?`}
          action="Remove from group"
          tone="danger"
          busy={busy}
          onClose={() => setRemoving(null)}
          onConfirm={() => {
            const person = removing;
            setRemoving(null);
            run(() => removeGroupMember(groupId, person.userId), `${person.name} was removed`);
          }}
        >
          They leave the group and its conversation. They can ask to join again later.
        </ConfirmDialog>
      )}
    </div>
  );
}

function DeleteGroup({ group, requestedAt }: { group: Group; requestedAt: string | null }) {
  const toast = useToast();
  const [reason, setReason] = useState("");
  const [sentAt, setSentAt] = useState(requestedAt);
  const [error, setError] = useState<string>();
  const [sending, start] = useTransition();

  if (sentAt) {
    return (
      <div className="flex flex-col gap-2 rounded-xl bg-ivory-200 p-4">
        <span className="font-sans text-sm font-semibold text-ink-700">Deletion requested</span>
        <p className="font-sans text-sm text-ink-500">
          You asked Grouv support to delete {group.title} on{" "}
          {new Date(sentAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}. They&rsquo;ll be in
          touch. The group stays open until then.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="font-sans text-sm text-ink-500">
        Deleting a group removes its conversation, Truth Board and video truths for every member, so it&rsquo;s done
        by Grouv support rather than on one tap. Tell us why and we&rsquo;ll take care of it, usually within a day.
      </p>
      <Labelled label="Why should it be deleted? (optional)">
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={1000}
          rows={3}
          className={cn(FIELD, "resize-none")}
        />
      </Labelled>
      <FormError message={error} />
      <Button
        type="button"
        size="sm"
        variant="secondary"
        fullWidth
        loading={sending}
        onClick={() =>
          start(async () => {
            const result = await requestGroupDeletion(group.id, reason);
            if (result.error) return setError(result.error);
            setSentAt(new Date().toISOString());
            toast({ title: "Request sent to Grouv support" });
          })
        }
      >
        Ask support to delete this group
      </Button>
    </div>
  );
}

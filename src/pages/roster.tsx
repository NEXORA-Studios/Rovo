import { invoke } from "@tauri-apps/api/core";
import { ArrowRightLeftIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import Counter from "@/components/Counter.tsx";
import SwipeRow from "@/components/SwipeRow.tsx";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Member = { id: string; name: string; status: string };
type Roster = { id: string; name: string; members: Member[] };
type Status = { id: string; name: string; color: string; description: string };
type Settings = { counters: unknown[]; rosters: Roster[]; statuses: Status[] };

export function RosterPage() {
    const [settings, setSettings] = useState<Settings>({ counters: [], rosters: [], statuses: [] });
    const [selectedRosterId, setSelectedRosterId] = useState("");
    const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
    const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
    const [filterStatusId, setFilterStatusId] = useState("all");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const latest = useRef(settings);
    const saveQueue = useRef(Promise.resolve());
    const selectedRoster = settings.rosters.find((roster) => roster.id === selectedRosterId);
    const selectedMember = selectedRoster?.members.find((member) => member.id === selectedMemberId);
    const visibleMembers = selectedRoster?.members.filter(
        (member) => filterStatusId === "all" || member.status === filterStatusId
    );

    useEffect(() => {
        let mounted = true;
        saveQueue.current
            .then(() => invoke<Settings>("get_settings"))
            .then((loadedSettings) => {
                if (!mounted) return;
                latest.current = loadedSettings;
                setSettings(loadedSettings);
                setSelectedRosterId(loadedSettings.rosters[0]?.id ?? "");
            })
            .catch((reason: unknown) => {
                if (mounted) setError(String(reason));
            })
            .finally(() => {
                if (mounted) setLoading(false);
            });
        return () => {
            mounted = false;
        };
    }, []);

    const statusCounts = new Map<string, number>();
    selectedRoster?.members.forEach((member) => statusCounts.set(member.status, (statusCounts.get(member.status) ?? 0) + 1));

    const save = (nextSettings: Settings) => {
        latest.current = nextSettings;
        setSettings(nextSettings);
        setError("");
        saveQueue.current = saveQueue.current
            .catch(() => undefined)
            .then(() => invoke<void>("save_settings", { settings: nextSettings }))
            .catch((reason: unknown) => setError(String(reason)));
    };

    const openStatusDialog = (member: Member) => {
        setSelectedMemberId(member.id);
    };

    const changeStatus = (statusId: string) => {
        if (!selectedRoster || !selectedMemberId || !statusId) return;
        const nextSettings: Settings = {
            ...latest.current,
            rosters: latest.current.rosters.map((roster) =>
                roster.id === selectedRoster.id
                    ? {
                          ...roster,
                          members: roster.members.map((member) =>
                              member.id === selectedMemberId ? { ...member, status: statusId } : member
                          ),
                      }
                    : roster
            ),
        };
        save(nextSettings);
        setSelectedMemberId(null);
    };

    const changeAllStatuses = (statusId: string) => {
        if (!selectedRoster) return;
        const nextSettings: Settings = {
            ...latest.current,
            rosters: latest.current.rosters.map((roster) =>
                roster.id === selectedRoster.id
                    ? { ...roster, members: roster.members.map((member) => ({ ...member, status: statusId })) }
                    : roster
            ),
        };
        save(nextSettings);
        setBulkDialogOpen(false);
    };

    if (loading) return <p className="p-4 text-sm text-muted-foreground">Loading rosters...</p>;

    if (!settings.rosters.length) {
        return (
            <section className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <h1 className="text-lg font-semibold">No rosters configured</h1>
                <p className="text-sm text-muted-foreground">Create a roster in Settings to view its members.</p>
                {error && (
                    <p role="alert" className="text-sm text-destructive">
                        {error}
                    </p>
                )}
            </section>
        );
    }

    return (
        <section className="mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col gap-5 overflow-hidden px-[2px] pb-4">
            <div className="border-b pb-5">
                <label className="flex w-full flex-col gap-2 text-sm text-muted-foreground">
                    Current roster
                    <Select value={selectedRosterId} onValueChange={(value) => setSelectedRosterId(String(value))}>
                        <SelectTrigger className="h-10 w-full">
                            <SelectValue placeholder="Choose a roster">{selectedRoster?.name}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {settings.rosters.map((roster) => (
                                <SelectItem key={roster.id} value={roster.id}>
                                    {roster.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </label>
            </div>

            {error && (
                <p role="alert" className="text-sm text-destructive">
                    Unable to save roster: {error}
                </p>
            )}

            {selectedRoster && (
                <>
                    <div className="grid grid-cols-2 gap-2 border-b pb-5">
                        <span className="text-xs text-muted-foreground">Status counts</span>
                        <span className="text-xs text-muted-foreground">Filter</span>
                        <div className="flex h-9 max-w-full min-w-0 items-center overflow-x-auto overflow-y-hidden text-sm">
                            {settings.statuses.map((status, index) => (
                                <span className="inline-flex items-baseline" key={status.id}>
                                    <Counter
                                        value={statusCounts.get(status.id) ?? 0}
                                        fontSize={18}
                                        fontWeight={600}
                                        textColor={status.color}
                                        intro={false}
                                        tabular
                                    />
                                    {index < settings.statuses.length - 1 && (
                                        <span className="px-1 text-muted-foreground">/</span>
                                    )}
                                </span>
                            ))}
                            {!settings.statuses.length && (
                                <p className="text-sm text-muted-foreground">No statuses configured.</p>
                            )}
                        </div>

                        <Select value={filterStatusId} onValueChange={(value) => setFilterStatusId(String(value))}>
                            <SelectTrigger className="h-9 w-full">
                                <SelectValue placeholder="All statuses">
                                    {filterStatusId === "all"
                                        ? "All statuses"
                                        : settings.statuses.find((status) => status.id === filterStatusId)?.name}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All statuses</SelectItem>
                                {settings.statuses.map((status) => (
                                    <SelectItem key={status.id} value={status.id}>
                                        {status.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <div className="col-span-2">
                            <Button
                                className="w-full"
                                variant="outline"
                                disabled={!selectedRoster.members.length || !settings.statuses.length}
                                onClick={() => setBulkDialogOpen(true)}>
                                Set all member statuses
                            </Button>
                        </div>
                    </div>

                    <div className="min-h-0 flex-1 divide-y overflow-y-auto">
                        {visibleMembers?.map((member) => {
                            const status = settings.statuses.find((item) => item.id === member.status);
                            return (
                                <SwipeRow
                                    actions={[
                                        {
                                            id: "change-status",
                                            label: "Status",
                                            icon: <ArrowRightLeftIcon className="size-5" />,
                                            color: "var(--primary)",
                                            onSelect: () => openStatusDialog(member),
                                        },
                                    ]}
                                    drawerColor="var(--background)"
                                    rowColor="var(--background)"
                                    textColor="var(--foreground)"
                                    actionWidth={86}
                                    radius={0}
                                    fullSwipe
                                    commitAt={-12}
                                    commitPrimary={false}
                                    height={64}
                                    key={member.id}
                                    label={`${member.name}, ${status?.name ?? "No status"}`}>
                                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{member.name}</span>
                                    <span
                                        className="shrink-0 text-xs font-medium"
                                        style={{ color: status?.color ?? "var(--muted-foreground)" }}>
                                        {status?.name ?? "No status"}
                                    </span>
                                </SwipeRow>
                            );
                        })}
                    </div>
                    {!selectedRoster.members.length && (
                        <p className="text-sm text-muted-foreground">No members in this roster.</p>
                    )}
                    {selectedRoster.members.length > 0 && !visibleMembers?.length && (
                        <p className="text-sm text-muted-foreground">No members match this filter.</p>
                    )}
                </>
            )}

            <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Set all member statuses</DialogTitle>
                        <DialogDescription>Choose a status for every member in {selectedRoster?.name}.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-2">
                        {settings.statuses.map((status) => (
                            <Button
                                className="h-10 border-0 text-sm"
                                disabled={selectedRoster?.members.every((member) => member.status === status.id) ?? true}
                                key={status.id}
                                onClick={() => changeAllStatuses(status.id)}
                                style={{
                                    backgroundColor: `color-mix(in srgb, ${status.color} 50%, transparent)`,
                                    color: "var(--primary-foreground)",
                                }}>
                                {status.name}
                            </Button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog
                open={selectedMember !== undefined && selectedMember !== null}
                onOpenChange={(open) => !open && setSelectedMemberId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Change member status</DialogTitle>
                        <DialogDescription>Choose the new status for {selectedMember?.name}.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-2">
                        {settings.statuses.map((status) => (
                            <Button
                                className="h-10 border-0 text-sm"
                                disabled={status.id === selectedMember?.status}
                                key={status.id}
                                onClick={() => changeStatus(status.id)}
                                style={{
                                    backgroundColor: `color-mix(in srgb, ${status.color} 50%, transparent)`,
                                    color: "var(--primary-foreground)",
                                }}>
                                {status.name}
                            </Button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </section>
    );
}

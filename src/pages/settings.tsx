import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    ColorPicker,
    ColorPickerArea,
    ColorPickerAreaThumb,
    ColorPickerContent,
    ColorPickerSlider,
    ColorPickerSwatchPreview,
    ColorPickerTrigger,
    ColorPickerView,
} from "@/components/ui/color-picker";
import {
    ArrowDownAZIcon,
    ArrowLeftIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    ChevronUpIcon,
    PlusIcon,
    Trash2Icon,
} from "lucide-react";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, Outlet, useNavigate, useParams } from "react-router-dom";
import { tailwindColorToHex } from "@/lib/utils";

type Counter = { id: string; name: string; count: number };
type Member = { id: string; name: string; status: string };
type Roster = { id: string; name: string; members: Member[] };
type Status = { id: string; name: string; color: string; description: string };
type Settings = { counters: Counter[]; rosters: Roster[]; statuses: Status[] };
type ContextValue = {
    data: Settings;
    update: (change: (data: Settings) => Settings) => void;
    error: string;
    retry: () => void;
};
const empty: Settings = { counters: [], rosters: [], statuses: [] };
const Context = createContext<ContextValue | null>(null);
const id = () => crypto.randomUUID();
let saveQueue: Promise<void> = Promise.resolve();

type SortDirection = "asc" | "desc";

function sortByName<T extends { name: string }>(items: T[], direction: SortDirection): T[] {
    const factor = direction === "asc" ? 1 : -1;
    return [...items].sort((a, b) => factor * a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

function moveItem<T>(items: T[], index: number, offset: -1 | 1): T[] {
    const target = index + offset;
    if (target < 0 || target >= items.length) return items;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
}

const TAILWIND_COLOR_PRESETS = [
    ["Red", "bg-red-500"],
    ["Orange", "bg-orange-500"],
    ["Amber", "bg-amber-500"],
    ["Yellow", "bg-yellow-500"],
    ["Green", "bg-green-500"],
    ["Emerald", "bg-emerald-500"],
    ["Cyan", "bg-cyan-500"],
    ["Blue", "bg-blue-500"],
    ["Indigo", "bg-indigo-500"],
    ["Violet", "bg-violet-500"],
    ["Pink", "bg-pink-500"],
    ["Slate", "bg-slate-500"],
] as const;

function useSettings() {
    const value = useContext(Context);
    if (!value) throw new Error("Settings context missing");
    return value;
}

export function SettingsPage() {
    const [data, setData] = useState(empty);
    const latest = useRef(empty);
    const [loaded, setLoaded] = useState(false);
    const [saveError, setSaveError] = useState("");
    const [failedSettings, setFailedSettings] = useState<Settings | null>(null);
    const [savedSettings, setSavedSettings] = useState(empty);
    const revision = useRef(0);

    useEffect(() => {
        let mounted = true;
        saveQueue
            .then(() => invoke<Settings>("get_settings"))
            .then((settings) => {
                if (!mounted) return;
                latest.current = settings;
                setData(settings);
                setSavedSettings(settings);
                setLoaded(true);
            })
            .catch((reason: unknown) => {
                if (mounted) setSaveError(String(reason));
            });
        return () => {
            mounted = false;
        };
    }, []);

    const persist = (settings: Settings) => {
        const rev = ++revision.current;
        setSaveError("");
        saveQueue = saveQueue
            .catch(() => undefined)
            .then(() => invoke<void>("save_settings", { settings }))
            .then(() => {
                if (rev === revision.current) {
                    setSavedSettings(settings);
                    setFailedSettings(null);
                }
            })
            .catch((reason: unknown) => {
                if (rev === revision.current) {
                    setSaveError(String(reason));
                    setFailedSettings(settings);
                }
            });
    };
    const update = (change: (current: Settings) => Settings) => {
        const next = change(latest.current);
        latest.current = next;
        setData(next);
        persist(next);
    };

    const retry = () => {
        if (failedSettings) persist(failedSettings);
    };
    const discard = () => {
        latest.current = savedSettings;
        setData(savedSettings);
        setSaveError("");
        setFailedSettings(null);
        revision.current += 1;
    };
    const context: ContextValue = { data, update, error: saveError, retry };
    return (
        <Context.Provider value={context}>
            {!loaded && !saveError ? <p className="p-4 text-sm text-muted-foreground">Loading settings...</p> : <Outlet />}
            <Dialog open={failedSettings !== null} onOpenChange={() => {}}>
                <DialogContent showCloseButton={false}>
                    <DialogHeader>
                        <DialogTitle>Could not save settings</DialogTitle>
                        <DialogDescription>
                            Your latest changes have not been saved. Retry saving them, or discard them and restore the last
                            saved version.
                        </DialogDescription>
                    </DialogHeader>
                    <p className="max-h-28 overflow-auto text-sm wrap-break-word text-destructive">{saveError}</p>
                    <DialogFooter>
                        <Button variant="outline" onClick={discard}>
                            Discard changes
                        </Button>
                        <Button onClick={retry}>Retry</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Context.Provider>
    );
}

function Frame({ title, back, action, children }: { title: string; back?: string; action?: ReactNode; children: ReactNode }) {
    const { error } = useSettings();
    return (
        <div className="flex h-full min-h-0 w-full flex-col gap-4 px-[2px]">
            <header className="flex shrink-0 items-center gap-3 border-b pb-3">
                {back && (
                    <Link
                        aria-label="Back"
                        className="inline-flex size-8 shrink-0 items-center justify-center rounded border hover:bg-accent"
                        to={back}>
                        <ArrowLeftIcon className="size-4" />
                    </Link>
                )}
                <h1 className="min-w-0 flex-1 text-lg font-semibold wrap-break-word">{title}</h1>
                {action}
            </header>
            {error && (
                <p role="alert" className="shrink-0 text-sm text-destructive">
                    Unable to load settings: {error}
                </p>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto pb-4">{children}</div>
        </div>
    );
}

export function SettingsHome() {
    const { data } = useSettings();
    const sections = [
        { to: "counters", title: "Counters", count: data.counters.length },
        { to: "rosters", title: "Rosters", count: data.rosters.length },
        { to: "statuses", title: "Roster statuses", count: data.statuses.length },
    ];
    return (
        <Frame title="Settings">
            <div className="divide-y">
                {sections.map((section) => (
                    <Link className="flex items-center gap-3 py-4 hover:text-primary" key={section.to} to={section.to}>
                        <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium">{section.title}</span>
                            <span className="mt-1 block text-xs text-muted-foreground">{section.count} configured</span>
                        </span>
                        <ChevronRightIcon className="size-4 text-muted-foreground" />
                    </Link>
                ))}
            </div>
        </Frame>
    );
}

function Field({
    label,
    value,
    type = "text",
    commit,
}: {
    label: string;
    value: string | number;
    type?: string;
    commit: (value: string) => void;
}) {
    return (
        <label className="flex min-w-0 flex-col gap-1.5 text-xs text-muted-foreground">
            {label}
            <input
                key={value}
                className="h-9 w-full rounded border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                type={type}
                defaultValue={value}
                onBlur={(event) => {
                    const input = event.currentTarget;
                    if (type === "number" && !Number.isSafeInteger(input.valueAsNumber)) {
                        input.value = String(value);
                        return;
                    }
                    if (input.value !== String(value)) commit(input.value);
                }}
                onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.nativeEvent.isComposing) event.currentTarget.blur();
                }}
            />
        </label>
    );
}

function Add({ label, action }: { label: string; action: () => void }) {
    return (
        <button
            aria-label={label}
            title={label}
            className="inline-flex size-8 items-center justify-center rounded border hover:bg-accent"
            onClick={action}
            type="button">
            <PlusIcon className="size-4" />
        </button>
    );
}
function StatusColorPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
    return (
        <ColorPicker format="hsla" value={value} onValueChange={(details) => onChange(details.value.toString("hex"))}>
            <ColorPickerTrigger className="inline-flex size-9 items-center justify-center rounded border bg-background hover:bg-accent">
                <ColorPickerSwatchPreview />
            </ColorPickerTrigger>
            <ColorPickerContent>
                <ColorPickerView format="hsla">
                    <ColorPickerArea>
                        <ColorPickerAreaThumb />
                    </ColorPickerArea>
                    <ColorPickerSlider channel="hue" />
                    <div className="flex flex-col gap-2 border-t pt-3">
                        <span className="text-xs font-medium text-muted-foreground">Presets</span>
                        <div className="flex flex-wrap gap-2">
                            {TAILWIND_COLOR_PRESETS.map(([label, utility]) => {
                                const color = tailwindColorToHex(utility);
                                if (!color) return null;
                                return (
                                    <button
                                        aria-label={`Use ${label} preset`}
                                        className="size-6 rounded-full border border-border shadow-xs outline-offset-2 transition-transform hover:scale-110 focus-visible:outline-2"
                                        key={utility}
                                        style={{ backgroundColor: color }}
                                        title={label}
                                        type="button"
                                        onClick={() => onChange(color)}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </ColorPickerView>
            </ColorPickerContent>
        </ColorPicker>
    );
}
function Remove({ label, action }: { label: string; action: () => void }) {
    return (
        <Button
            aria-label={label}
            title={label}
            className="size-9 shrink-0"
            onClick={action}
            type="button"
            variant="destructive"
            size="icon-lg">
            <Trash2Icon className="size-4" />
        </Button>
    );
}

function SortDialog({ listName, onSort }: { listName: string; onSort: (direction: SortDirection) => void }) {
    const [open, setOpen] = useState(false);
    const [direction, setDirection] = useState<SortDirection>("asc");

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <Button aria-label={`Sort ${listName}`} variant="outline" size="sm" onClick={() => setOpen(true)}>
                <ArrowDownAZIcon />
                Sort
            </Button>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Sort {listName}</DialogTitle>
                    <DialogDescription>Choose a name order and confirm to reorder this list.</DialogDescription>
                </DialogHeader>
                <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                    Name order
                    <select
                        className="h-9 w-full rounded border bg-background px-3 text-sm text-foreground"
                        value={direction}
                        onChange={(event) => setDirection(event.target.value as SortDirection)}>
                        <option value="asc">Name: A to Z</option>
                        <option value="desc">Name: Z to A</option>
                    </select>
                </label>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={() => {
                            onSort(direction);
                            setOpen(false);
                        }}>
                        Sort list
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function OrderControls({
    label,
    index,
    count,
    onMove,
}: {
    label: string;
    index: number;
    count: number;
    onMove: (offset: -1 | 1) => void;
}) {
    return (
        <div className="flex items-center gap-1">
            <Button
                aria-label={`Move ${label} up`}
                disabled={index === 0}
                variant="outline"
                size="icon-lg"
                onClick={() => onMove(-1)}>
                <ChevronUpIcon />
            </Button>
            <Button
                aria-label={`Move ${label} down`}
                disabled={index === count - 1}
                variant="outline"
                size="icon-lg"
                onClick={() => onMove(1)}>
                <ChevronDownIcon />
            </Button>
        </div>
    );
}

export function CounterSettings() {
    const { data, update } = useSettings();
    return (
        <Frame
            title="Counters"
            back="/settings"
            action={
                <div className="flex items-center gap-2">
                    <SortDialog
                        listName="counters"
                        onSort={(direction) => update((d) => ({ ...d, counters: sortByName(d.counters, direction) }))}
                    />
                    <Add
                        label="Add counter"
                        action={() =>
                            update((d) => ({ ...d, counters: [...d.counters, { id: id(), name: "New counter", count: 0 }] }))
                        }
                    />
                </div>
            }>
            <div className="divide-y">
                {data.counters.map((item, index) => (
                    <div className="grid grid-cols-[minmax(0,1fr)_76px_36px] items-end gap-3 py-3" key={item.id}>
                        <Field
                            label="Name"
                            value={item.name}
                            commit={(name) =>
                                update((d) => ({
                                    ...d,
                                    counters: d.counters.map((x) => (x.id === item.id ? { ...x, name } : x)),
                                }))
                            }
                        />
                        <OrderControls
                            label={item.name}
                            index={index}
                            count={data.counters.length}
                            onMove={(offset) => update((d) => ({ ...d, counters: moveItem(d.counters, index, offset) }))}
                        />
                        <Remove
                            label={`Delete ${item.name}`}
                            action={() => update((d) => ({ ...d, counters: d.counters.filter((x) => x.id !== item.id) }))}
                        />
                    </div>
                ))}
            </div>
            {!data.counters.length && <p className="text-sm text-muted-foreground">No counters configured.</p>}
        </Frame>
    );
}

export function StatusSettings() {
    const { data, update } = useSettings();
    return (
        <Frame
            title="Roster statuses"
            back="/settings"
            action={
                <div className="flex items-center gap-2">
                    <SortDialog
                        listName="statuses"
                        onSort={(direction) => update((d) => ({ ...d, statuses: sortByName(d.statuses, direction) }))}
                    />
                    <Add
                        label="Add status"
                        action={() =>
                            update((d) => ({
                                ...d,
                                statuses: [...d.statuses, { id: id(), name: "New status", color: "#64748b", description: "" }],
                            }))
                        }
                    />
                </div>
            }>
            <div className="divide-y">
                {data.statuses.map((item, index) => (
                    <div className="grid grid-cols-[minmax(0,1fr)_64px_76px_36px] items-end gap-x-3 gap-y-3 py-3" key={item.id}>
                        <Field
                            label="Name"
                            value={item.name}
                            commit={(name) =>
                                update((d) => ({
                                    ...d,
                                    statuses: d.statuses.map((x) => (x.id === item.id ? { ...x, name } : x)),
                                }))
                            }
                        />
                        <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                            <span>Color</span>
                            <StatusColorPicker
                                value={item.color}
                                onChange={(color) =>
                                    update((d) => ({
                                        ...d,
                                        statuses: d.statuses.map((x) => (x.id === item.id ? { ...x, color } : x)),
                                    }))
                                }
                            />
                        </div>
                        <OrderControls
                            label={item.name}
                            index={index}
                            count={data.statuses.length}
                            onMove={(offset) => update((d) => ({ ...d, statuses: moveItem(d.statuses, index, offset) }))}
                        />
                        <Remove
                            label={`Delete ${item.name}`}
                            action={() => update((d) => ({ ...d, statuses: d.statuses.filter((x) => x.id !== item.id) }))}
                        />
                        <div className="col-span-full">
                            <Field
                                label="Description"
                                value={item.description}
                                commit={(description) =>
                                    update((d) => ({
                                        ...d,
                                        statuses: d.statuses.map((x) => (x.id === item.id ? { ...x, description } : x)),
                                    }))
                                }
                            />
                        </div>
                    </div>
                ))}
            </div>
            {!data.statuses.length && <p className="text-sm text-muted-foreground">No statuses configured.</p>}
        </Frame>
    );
}

export function RosterSettings() {
    const { data, update } = useSettings();
    const navigate = useNavigate();
    return (
        <Frame
            title="Rosters"
            back="/settings"
            action={
                <div className="flex items-center gap-2">
                    <SortDialog
                        listName="rosters"
                        onSort={(direction) => update((d) => ({ ...d, rosters: sortByName(d.rosters, direction) }))}
                    />
                    <Add
                        label="Add roster"
                        action={() => {
                            const roster = { id: id(), name: "New roster", members: [] };
                            update((d) => ({ ...d, rosters: [...d.rosters, roster] }));
                            navigate(`/settings/rosters/${roster.id}`);
                        }}
                    />
                </div>
            }>
            <div className="divide-y">
                {data.rosters.map((roster, index) => (
                    <div className="flex items-center gap-2 py-2" key={roster.id}>
                        <Link
                            className="flex min-w-0 flex-1 items-center gap-3 py-2 hover:text-primary"
                            to={`/settings/rosters/${roster.id}`}>
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-medium">{roster.name}</span>
                                <span className="mt-1 block text-xs text-muted-foreground">
                                    {roster.members.length} members
                                </span>
                            </span>
                            <ChevronRightIcon className="size-4 text-muted-foreground" />
                        </Link>
                        <OrderControls
                            label={roster.name}
                            index={index}
                            count={data.rosters.length}
                            onMove={(offset) => update((d) => ({ ...d, rosters: moveItem(d.rosters, index, offset) }))}
                        />
                    </div>
                ))}
            </div>
            {!data.rosters.length && <p className="text-sm text-muted-foreground">No rosters configured.</p>}
        </Frame>
    );
}

export function RosterDetail() {
    const { rosterId = "" } = useParams();
    const { data, update } = useSettings();
    const navigate = useNavigate();
    const roster = data.rosters.find((item) => item.id === rosterId);
    if (!roster)
        return (
            <Frame title="Roster" back="/settings/rosters">
                <p>Roster not found.</p>
            </Frame>
        );
    return (
        <Frame
            title={roster.name}
            back="/settings/rosters"
            action={
                <div className="flex items-center gap-2">
                    <SortDialog
                        listName="members"
                        onSort={(direction) =>
                            update((d) => ({
                                ...d,
                                rosters: d.rosters.map((item) =>
                                    item.id === rosterId ? { ...item, members: sortByName(item.members, direction) } : item
                                ),
                            }))
                        }
                    />
                    <Add
                        label="Add member"
                        action={() =>
                            update((d) => ({
                                ...d,
                                rosters: d.rosters.map((x) =>
                                    x.id === rosterId
                                        ? { ...x, members: [...x.members, { id: id(), name: "New member", status: "" }] }
                                        : x
                                ),
                            }))
                        }
                    />
                </div>
            }>
            <div className="flex items-end gap-3 border-b pb-4">
                <div className="min-w-0 flex-1">
                    <Field
                        label="Roster name"
                        value={roster.name}
                        commit={(name) =>
                            update((d) => ({ ...d, rosters: d.rosters.map((x) => (x.id === rosterId ? { ...x, name } : x)) }))
                        }
                    />
                </div>
                <Remove
                    label="Delete roster"
                    action={() => {
                        update((d) => ({ ...d, rosters: d.rosters.filter((x) => x.id !== rosterId) }));
                        navigate("/settings/rosters");
                    }}
                />
            </div>
            <div className="divide-y">
                {roster.members.map((member, index) => (
                    <div className="grid grid-cols-[minmax(0,1fr)_76px_36px] items-end gap-3 py-3" key={member.id}>
                        <Field
                            label="Member name"
                            value={member.name}
                            commit={(name) =>
                                update((d) => ({
                                    ...d,
                                    rosters: d.rosters.map((x) =>
                                        x.id === rosterId
                                            ? { ...x, members: x.members.map((m) => (m.id === member.id ? { ...m, name } : m)) }
                                            : x
                                    ),
                                }))
                            }
                        />
                        <OrderControls
                            label={member.name}
                            index={index}
                            count={roster.members.length}
                            onMove={(offset) =>
                                update((d) => ({
                                    ...d,
                                    rosters: d.rosters.map((x) =>
                                        x.id === rosterId ? { ...x, members: moveItem(x.members, index, offset) } : x
                                    ),
                                }))
                            }
                        />
                        <Remove
                            label={`Delete ${member.name}`}
                            action={() =>
                                update((d) => ({
                                    ...d,
                                    rosters: d.rosters.map((x) =>
                                        x.id === rosterId ? { ...x, members: x.members.filter((m) => m.id !== member.id) } : x
                                    ),
                                }))
                            }
                        />
                    </div>
                ))}
            </div>
            {!roster.members.length && <p className="text-sm text-muted-foreground">No members in this roster.</p>}
        </Frame>
    );
}

import { invoke } from "@tauri-apps/api/core";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CircleIcon, CircleMinusIcon, CirclePlusIcon } from "lucide-react";
import { notificationFeedback } from "@tauri-apps/plugin-haptics";

import CounterDisplay from "@/components/Counter.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";

type Counter = { id: string; name: string; count: number };
type Settings = { counters: Counter[] };

export function CounterPage() {
    const [counters, setCounters] = useState<Counter[]>([]);
    const [selectedId, setSelectedId] = useState("");
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const writes = useRef(Promise.resolve());
    const current = counters.find((counter) => counter.id === selectedId);

    useEffect(() => {
        let mounted = true;
        invoke<Settings>("get_settings")
            .then(({ counters: initialCounters }) => {
                if (!mounted) return;
                setCounters(initialCounters);
                if (initialCounters.length) {
                    setSelectedId(initialCounters[0].id);
                    setCount(initialCounters[0].count);
                }
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

    const selectCounter = (counterId: string) => {
        const selected = counters.find((counter) => counter.id === counterId);
        if (!selected) return;
        setSelectedId(counterId);
        setCount(selected.count);
        setError("");
    };

    const setCounterValue = async (nextCount: number) => {
        if (!current) return;
        setCount(nextCount);
        setCounters((items) => items.map((item) => (item.id === current.id ? { ...item, count: nextCount } : item)));
        setError("");
        const counterId = current.id;
        writes.current = writes.current
            .catch(() => undefined)
            .then(() => invoke<void>("update_counter_count", { counterId, count: nextCount }))
            .catch(async (reason: unknown) => {
                await notificationFeedback("error");
                setError(String(reason));
            });
        await notificationFeedback("success");
    };

    if (loading) return <p className="p-4 text-sm text-muted-foreground">Loading counters...</p>;
    if (!counters.length) {
        return (
            <section className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <h1 className="text-lg font-semibold">No counters configured</h1>
                <p className="text-sm text-muted-foreground">Create a counter in Settings to start counting.</p>
                <Link className="text-sm text-primary underline" to="/settings/counters">
                    Open counter settings
                </Link>
            </section>
        );
    }

    return (
        <section className="flex h-full min-h-0 flex-col items-center justify-center gap-10 px-0.5 py-8">
            <div className="w-full max-w-sm px-0.5 pb-6">
                <label className="flex w-full flex-col gap-2 text-sm text-muted-foreground">
                    Current counter
                    <Select value={selectedId} onValueChange={(value) => selectCounter(String(value))}>
                        <SelectTrigger className="h-10 w-full">
                            <SelectValue placeholder="Choose a counter">{current?.name}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {counters.map((counter) => (
                                <SelectItem key={counter.id} value={counter.id}>
                                    {counter.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </label>
            </div>
            {error && (
                <p role="alert" className="max-w-full text-sm wrap-break-word text-destructive">
                    {error}
                </p>
            )}
            <div
                aria-live="polite"
                className="flex flex-1 items-center justify-center"
                aria-label={`${current?.name ?? "Counter"}: ${count}`}>
                <CounterDisplay value={count} fontSize={112} fontWeight={600} motionBlur intro={false} tabular />
            </div>
            <div className="grid w-full max-w-2xl grid-cols-3 gap-4">
                <button
                    aria-label="Increase count"
                    className="flex h-20 items-center justify-center rounded-lg border bg-background font-semibold text-green-500 shadow-sm transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
                    onClick={() => setCounterValue(count + 1)}
                    type="button">
                    <CirclePlusIcon className="size-8" />
                </button>
                <button
                    aria-label="Reset count"
                    className="flex h-20 items-center justify-center rounded-lg border bg-background font-semibold text-yellow-500 shadow-sm transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
                    onClick={() => setCounterValue(0)}
                    type="button">
                    <CircleIcon className="size-8" />
                </button>
                <button
                    aria-label="Decrease count"
                    className="flex h-20 items-center justify-center rounded-lg border bg-background font-semibold text-red-500 shadow-sm transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
                    onClick={() => setCounterValue(count - 1)}
                    type="button">
                    <CircleMinusIcon className="size-8" />
                </button>
            </div>
        </section>
    );
}

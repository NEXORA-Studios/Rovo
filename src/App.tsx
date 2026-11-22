import { Outlet, useNavigate } from "react-router-dom";
import RubberSegment from "@/components/RubberSegment";

const navigations = [
    {
        label: "Counter",
        path: "/counter",
    },
    {
        label: "Roster",
        path: "/roster",
    },
    {
        label: "Settings",
        path: "/settings",
    },
];

export function App() {
    const push = useNavigate();

    return (
        <div className="flex h-screen w-screen flex-col overflow-hidden px-4 pt-12 pb-6">
            <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <Outlet />
            </main>
            <RubberSegment
                items={navigations.map((nav) => nav.label)}
                defaultValue={navigations.map((nav) => nav.label)[0]}
                onChange={(_, index) => {
                    push(navigations[index].path);
                }}
                trackColor="color-mix(in srgb, var(--accent) 50%, transparent)"
                thumbColor="var(--accent)"
                textColor="var(--foreground)"
                activeTextColor="var(--foreground)"
                size="md"
                radius={10}
                inset={3}
                equalSlots
                stretch={100}
                squash={3}
                speed={1}
                glide={75}
                draggable
                disabled={false}
            />
        </div>
    );
}

export default App;

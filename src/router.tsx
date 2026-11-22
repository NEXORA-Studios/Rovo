import { HashRouter, Navigate, Route, Routes } from "react-router-dom";

import { CounterPage } from "@/pages/counter.tsx";
import { RosterPage } from "@/pages/roster.tsx";

import App from "@/App.tsx";
import {
    CounterSettings,
    RosterDetail,
    RosterSettings,
    SettingsHome,
    SettingsPage,
    StatusSettings,
} from "@/pages/settings.tsx";

export function AppRouter() {
    return (
        <HashRouter>
            <Routes>
                <Route element={<App />}>
                    <Route index element={<Navigate replace to="/counter" />} />

                    <Route path="counter" element={<CounterPage />} />

                    <Route path="roster" element={<RosterPage />} />

                    <Route path="settings" element={<SettingsPage />}>
                        <Route index element={<SettingsHome />} />

                        <Route path="counters" element={<CounterSettings />} />
                        <Route path="statuses" element={<StatusSettings />} />
                        <Route path="rosters" element={<RosterSettings />} />
                        <Route path="rosters/:rosterId" element={<RosterDetail />} />

                        <Route path="*" element={<Navigate replace to="/settings" />} />
                    </Route>

                    <Route path="*" element={<Navigate replace to="/counter" />} />
                </Route>
            </Routes>
        </HashRouter>
    );
}

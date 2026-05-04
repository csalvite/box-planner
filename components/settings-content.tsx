"use client";

import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { User, Target, Moon } from "lucide-react";
import { useBoxPlannerStore } from "@/lib/store";
import { useState } from "react";
import { useAppTranslation } from "@/hooks/use-app-translation";

export function SettingsContent() {
  const { stats, updateStats } = useBoxPlannerStore();
  const { t } = useAppTranslation();
  const [weeklyGoal, setWeeklyGoal] = useState(stats.weeklyGoalMinutes);

  const handleSaveGoal = () => {
    updateStats({ weeklyGoalMinutes: weeklyGoal });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          {t("settings.title")}
        </h1>
        <p className="mt-1 text-muted-foreground">{t("settings.subtitle")}</p>
      </div>

      <div className="space-y-4">
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  {t("settings.profile")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("settings.accountInfo")}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="name">{t("settings.name")}</Label>
                <Input
                  id="name"
                  placeholder={t("settings.namePlaceholder")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t("settings.email")}</Label>
                <Input id="email" type="email" placeholder="tu@email.com" />
              </div>

              <Button className="w-full">{t("settings.saveChanges")}</Button>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2/20">
                <Target className="h-5 w-5 text-chart-2" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  {t("settings.weeklyGoal")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("settings.weeklyGoalDescription")}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="goal">{t("settings.minutesPerWeek")}</Label>
                <Input
                  id="goal"
                  type="number"
                  min="0"
                  value={weeklyGoal}
                  onChange={(e) =>
                    setWeeklyGoal(Number.parseInt(e.target.value) || 0)
                  }
                />
              </div>

              <Button onClick={handleSaveGoal} className="w-full">
                {t("settings.updateGoal")}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                <Moon className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  {t("settings.theme")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("settings.darkMode")}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

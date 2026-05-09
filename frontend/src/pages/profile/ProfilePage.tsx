import { useState } from "react";

import { PageWrapper } from "../../components/layout/PageWrapper";
import { Button } from "../../components/ui/Button";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { useAuthStore } from "../../store/authStore";

export function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [fullName, setFullName] = useState(user?.full_name ?? "");

  return (
    <PageWrapper title="User Profile" subtitle="Manage your account details and display name.">
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-white">Profile Settings</h2>
        </CardHeader>
        <CardBody>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Email" value={user?.email ?? ""} disabled />
            <Input label="Full Name" value={fullName} onChange={(event) => setFullName(event.target.value)} />
          </div>
          <div className="mt-4">
            <Button
              onClick={() => {
                if (!user) return;
                setUser({ ...user, full_name: fullName });
              }}
            >
              Save Profile
            </Button>
          </div>
        </CardBody>
      </Card>
    </PageWrapper>
  );
}

import { Link } from "react-router-dom";

import { Button } from "../../components/ui/Button";
import { Card, CardBody } from "../../components/ui/Card";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4">
      <Card className="w-full max-w-lg">
        <CardBody>
          <h1 className="text-3xl font-bold text-white">404</h1>
          <p className="mt-2 text-sm text-[#aaaaaa]">The page you are looking for does not exist.</p>
          <Link to="/" className="mt-4 inline-block">
            <Button>Back to Dashboard</Button>
          </Link>
        </CardBody>
      </Card>
    </div>
  );
}

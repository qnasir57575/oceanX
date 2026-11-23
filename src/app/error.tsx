"use client";

import { useEffect } from "react";
import { Container } from "@/components/ui/container";
import { Button, ButtonLink } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/states";
import { Icon } from "@/components/icons";
import { describeError } from "@/lib/ui/errors";

/** Route-level error boundary (below the root layout, so header/footer stay). */
export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const d = describeError(error, "this page");
  return (
    <Container className="flex flex-1 flex-col justify-center py-16">
      <title>Something went wrong · OceanX</title>
      <ErrorState
        headingLevel="h1"
        title={d.title}
        message={d.message}
        reference={d.reference}
        debug={d.debug}
        action={
          <>
            {d.retryable ? (
              <Button onClick={() => retry()}>
                <Icon name="refresh" size={18} />
                Try again
              </Button>
            ) : null}
            <ButtonLink href="/" variant="secondary">
              Go to home page
            </ButtonLink>
          </>
        }
      />
    </Container>
  );
}

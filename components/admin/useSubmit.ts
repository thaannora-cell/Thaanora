"use client";

import { useActionState, useTransition } from "react";

// Like <form action={…}>, but React doesn't clear the fields afterwards, so a form that comes back
// with "please check this field" keeps everything the person typed.
export function useSubmit<S>(action: (prev: S, form: FormData) => Promise<S>, initial: S) {
  const [state, dispatch, pending] = useActionState<S, FormData>(action as (prev: Awaited<S>, form: FormData) => Promise<S>, initial as Awaited<S>);
  const [, start] = useTransition();
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    start(() => dispatch(data));
  };
  return [state, onSubmit, pending] as const;
}

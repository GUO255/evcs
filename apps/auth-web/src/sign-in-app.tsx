import { useEffect, useState, type FormEvent } from "react";

import { AuthUiError, createAuthApi } from "@/auth-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import logoUrl from "@/assets/logo.png?inline";

type Phase = "initializing" | "ready" | "submitting" | "redirecting" | "failed";
type Mode = "sign-in" | "sign-up";

const api = createAuthApi();

export function SignInApp() {
  const [phase, setPhase] = useState<Phase>("initializing");
  const [mode, setMode] = useState<Mode>("sign-in");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [usernameError, setUsernameError] = useState<string>();
  const [passwordError, setPasswordError] = useState<string>();
  const [confirmError, setConfirmError] = useState<string>();
  const [requestError, setRequestError] = useState<string>();
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    let active = true;
    api.initialize()
      .then(() => { if (active) setPhase("ready"); })
      .catch((error: unknown) => {
        if (!active) return;
        setRequestError(messageFor(error, "登录服务初始化失败，请刷新页面重试"));
        setPhase("failed");
      });
    return () => { active = false; };
  }, []);

  const busy = phase === "initializing" || phase === "submitting" || phase === "redirecting";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;
    setRequestError(undefined);
    setPhase("submitting");
    try {
      if (mode === "sign-up") {
        await api.signUp(username, password);
        setRegistered(true);
        setMode("sign-in");
        setPassword("");
        setConfirmPassword("");
        setPhase("ready");
      } else {
        const result = await api.signIn(username, password);
        setPhase("redirecting");
        window.location.assign(result.url);
      }
    } catch (error) {
      setRequestError(messageFor(error));
      setPhase("ready");
    }
  }

  function validate(): boolean {
    const usernameValid = /^[a-zA-Z0-9_]{3,32}$/.test(username);
    setUsernameError(usernameValid ? undefined : "用户名需为 3-32 位字母、数字或下划线");
    const passwordValid = password.length >= 6 && password.length <= 128;
    setPasswordError(passwordValid ? undefined : "密码至少 6 位");
    const confirmValid = mode === "sign-in" || confirmPassword === password;
    setConfirmError(confirmValid ? undefined : "两次输入的密码不一致");
    return usernameValid && passwordValid && confirmValid;
  }

  function switchMode(next: Mode) {
    setMode(next);
    setUsernameError(undefined);
    setPasswordError(undefined);
    setConfirmError(undefined);
    setRequestError(undefined);
    setRegistered(false);
  }

  return (
    <main className="flex min-h-svh flex-col bg-muted/40 p-4 sm:p-6">
      <img
        alt="极充智联"
        className="h-10 w-auto self-start sm:h-11"
        height={53}
        src={logoUrl}
        width={190}
      />

      <div className="flex w-full flex-1 items-center justify-center py-4">
        <Card className="w-full max-w-md shadow-sm">
          <CardHeader className="gap-2 px-6 pt-2 sm:px-7">
            <CardTitle>
              <h1 className="text-2xl font-semibold tracking-tight">极充智联登录</h1>
            </CardTitle>
            <CardDescription>
              {mode === "sign-in" ? "使用用户名和密码登录平台" : "注册一个新的平台账号"}
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 sm:px-7">
            <form className="flex flex-col gap-5" onSubmit={submit}>
              <FieldGroup>
                <Field data-invalid={usernameError !== undefined}>
                  <FieldLabel htmlFor="username">用户名</FieldLabel>
                  <Input
                    aria-invalid={usernameError !== undefined}
                    autoComplete="username"
                    disabled={busy || phase === "failed"}
                    id="username"
                    maxLength={32}
                    onChange={(event) => {
                      setUsername(event.target.value.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 32));
                      setUsernameError(undefined);
                    }}
                    placeholder="3-32 位字母、数字或下划线"
                    value={username}
                  />
                  <FieldError>{usernameError}</FieldError>
                </Field>

                <Field data-invalid={passwordError !== undefined}>
                  <FieldLabel htmlFor="password">密码</FieldLabel>
                  <Input
                    aria-invalid={passwordError !== undefined}
                    autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                    disabled={busy || phase === "failed"}
                    id="password"
                    maxLength={128}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setPasswordError(undefined);
                    }}
                    placeholder="至少 6 位"
                    type="password"
                    value={password}
                  />
                  <FieldError>{passwordError}</FieldError>
                </Field>

                {mode === "sign-up" && (
                  <Field data-invalid={confirmError !== undefined}>
                    <FieldLabel htmlFor="confirm-password">确认密码</FieldLabel>
                    <Input
                      aria-invalid={confirmError !== undefined}
                      autoComplete="new-password"
                      disabled={busy || phase === "failed"}
                      id="confirm-password"
                      maxLength={128}
                      onChange={(event) => {
                        setConfirmPassword(event.target.value);
                        setConfirmError(undefined);
                      }}
                      placeholder="再次输入密码"
                      type="password"
                      value={confirmPassword}
                    />
                    <FieldError>{confirmError}</FieldError>
                  </Field>
                )}
              </FieldGroup>

              {registered && (
                <div className="text-sm text-emerald-600" role="status">注册成功，请使用新账号登录</div>
              )}
              <div aria-live="polite" className="min-h-5 text-sm text-destructive" role="status">
                {requestError}
              </div>

              {phase === "failed" ? (
                <Button onClick={() => window.location.reload()} size="lg" type="button" variant="outline">
                  刷新重试
                </Button>
              ) : (
                <>
                  <Button disabled={busy} size="lg" type="submit">
                    {(phase === "submitting" || phase === "redirecting") && <Spinner data-icon="inline-start" />}
                    {phase === "redirecting"
                      ? "正在进入平台"
                      : phase === "submitting"
                        ? mode === "sign-in" ? "登录中" : "注册中"
                        : mode === "sign-in" ? "登录" : "注册"}
                  </Button>
                  <Button
                    disabled={busy || phase === "failed"}
                    onClick={() => switchMode(mode === "sign-in" ? "sign-up" : "sign-in")}
                    size="lg"
                    type="button"
                    variant="outline"
                  >
                    {mode === "sign-in" ? "没有账号？去注册" : "已有账号？去登录"}
                  </Button>
                </>
              )}
            </form>
          </CardContent>

          <CardFooter className="justify-center px-6 py-3 text-xs text-muted-foreground sm:px-7">
            登录即表示您正在访问极充智联平台服务
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}

function messageFor(error: unknown, fallback = "登录服务暂时不可用，请稍后重试"): string {
  return error instanceof AuthUiError ? error.message : fallback;
}

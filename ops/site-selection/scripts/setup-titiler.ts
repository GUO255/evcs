const root = new URL("../../../", import.meta.url).pathname;
const virtualEnvironment = "ops/site-selection/titiler/.venv";
const env = { ...process.env, DYLD_LIBRARY_PATH: "/opt/homebrew/opt/expat/lib" };

async function run(command: string[]) {
  const child = Bun.spawn(command, {
    cwd: root,
    env,
    stderr: "inherit",
    stdout: "inherit",
  });
  if (await child.exited) throw new Error(`${command.join(" ")} failed`);
}

await run(["/opt/homebrew/bin/python3.12", "-m", "venv", virtualEnvironment]);
await run([
  `${virtualEnvironment}/bin/python`,
  "-m",
  "pip",
  "install",
  "--disable-pip-version-check",
  "-i",
  "https://pypi.tuna.tsinghua.edu.cn/simple",
  "-r",
  "ops/site-selection/titiler/requirements.txt",
]);

console.log("TiTiler Python 环境已安装完成");

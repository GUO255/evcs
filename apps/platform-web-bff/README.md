# platform-web-bff（进程占位）

开发工具链的进程占位应用。将同名真实 @evcs/platform-web-bff 包放入本目录后即可无缝替换，环境契约与 PM2 编排无需改动。

环境输入见 ops/.env.development.local，进程运行时只读取 ops/.env.generated/ 下对应角色的最小快照。

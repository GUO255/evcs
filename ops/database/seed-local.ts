import mysql, { type Pool, type RowDataPacket } from "mysql2/promise";

const localDevelopmentDatabaseUrl = "mysql://evcs:123456@127.0.0.1:3307/evcs";
const databaseUrl = process.env.EVCS_DATABASE_URL ?? localDevelopmentDatabaseUrl;

const explorationStatusByKey: Readonly<Record<string, number>> = {
  draft: 1,
  completed: 3,
  signed: 4,
  "under-construction": 5,
  operating: 7,
};

const recommendationByKey: Readonly<Record<string, number>> = {
  "": 0,
  "needs-review": 1,
  priority: 2,
  recommended: 3,
  cautious: 4,
  paused: 5,
};

const explorerNames = [
  "周建伟", "陈雨桐", "孙志强", "刘思远", "赵子昂", "李浩然", "高明宇", "张文博", "马会超",
  "宋佳宁", "王立新", "郭晓峰", "何俊杰", "郑凯旋", "许安然", "杨晨光", "杜海涛", "冯嘉诚", "罗宇航",
];

const teamMembers: Readonly<Record<string, string[]>> = {
  一组: ["周建伟", "陈雨桐", "孙志强", "宋佳宁", "许安然", "杜海涛"],
  二组: ["赵子昂", "王立新", "郭晓峰", "郑凯旋", "杨晨光", "冯嘉诚"],
  三组: ["李浩然", "高明宇", "张文博", "马会超"],
  四组: ["刘思远", "何俊杰", "罗宇航"],
};

const siteSeeds = [
  { siteName: "航空港物流园重卡充电站", longitude: 113.84, latitude: 34.52, city: "郑州市", district: "航空港区", status: "operating", explorerName: "周建伟", explorationTeam: "一组" },
  { siteName: "经开区国际物流园候选站", longitude: 113.8, latitude: 34.72, city: "郑州市", district: "经开区", status: "draft", explorerName: "陈雨桐", explorationTeam: "一组" },
  { siteName: "兰考县国道综合补能站", longitude: 114.82, latitude: 34.82, city: "开封市", district: "兰考县", status: "draft", explorerName: "孙志强", explorationTeam: "一组" },
  { siteName: "孟津区产业园公共充电站", longitude: 112.45, latitude: 34.83, city: "洛阳市", district: "孟津区", status: "under-construction", explorerName: "刘思远", explorationTeam: "四组" },
  { siteName: "宝丰县货运枢纽充电站", longitude: 113.05, latitude: 33.87, city: "平顶山市", district: "宝丰县", status: "draft", explorerName: "赵子昂", explorationTeam: "二组" },
  { siteName: "汤阴县高速口充换电站", longitude: 114.36, latitude: 35.92, city: "安阳市", district: "汤阴县", status: "draft", explorerName: "李浩然", explorationTeam: "三组" },
  { siteName: "山城区车队专用充电站", longitude: 114.18, latitude: 35.9, city: "鹤壁市", district: "山城区", status: "under-construction", explorerName: "高明宇", explorationTeam: "三组" },
  { siteName: "原阳县城市配送充电站", longitude: 113.94, latitude: 35.05, city: "新乡市", district: "原阳县", status: "draft", explorerName: "张文博", explorationTeam: "三组" },
  { siteName: "武陟县物流园重卡充电站", longitude: 113.4, latitude: 35.1, city: "焦作市", district: "武陟县", status: "draft", explorerName: "马会超", explorationTeam: "三组" },
  { siteName: "华龙区国道综合补能站", longitude: 115.07, latitude: 35.77, city: "濮阳市", district: "华龙区", status: "signed", explorerName: "宋佳宁", explorationTeam: "一组" },
  { siteName: "建安区停车场光储充站", longitude: 113.83, latitude: 34.12, city: "许昌市", district: "建安区", status: "draft", explorerName: "王立新", explorationTeam: "二组" },
  { siteName: "召陵区产业园公共充电站", longitude: 114.1, latitude: 33.59, city: "漯河市", district: "召陵区", status: "draft", explorerName: "郭晓峰", explorationTeam: "二组" },
  { siteName: "陕州区高速口充换电站", longitude: 111.1, latitude: 34.72, city: "三门峡市", district: "陕州区", status: "completed", explorerName: "何俊杰", explorationTeam: "四组" },
  { siteName: "卧龙区货运枢纽充电站", longitude: 112.53, latitude: 33.0, city: "南阳市", district: "卧龙区", status: "draft", explorerName: "郑凯旋", explorationTeam: "二组" },
  { siteName: "梁园区物流园重卡充电站", longitude: 115.61, latitude: 34.44, city: "商丘市", district: "梁园区", status: "draft", explorerName: "许安然", explorationTeam: "一组" },
  { siteName: "平桥区车队专用充电站", longitude: 114.12, latitude: 32.1, city: "信阳市", district: "平桥区", status: "completed", explorerName: "杨晨光", explorationTeam: "二组" },
  { siteName: "川汇区城市配送充电站", longitude: 114.65, latitude: 33.62, city: "周口市", district: "川汇区", status: "draft", explorerName: "杜海涛", explorationTeam: "一组" },
  { siteName: "驿城区国道综合补能站", longitude: 114.02, latitude: 32.98, city: "驻马店市", district: "驿城区", status: "draft", explorerName: "冯嘉诚", explorationTeam: "二组" },
  { siteName: "玉泉街道产业园公共充电站", longitude: 112.61, latitude: 35.09, city: "济源市", district: "玉泉街道", status: "completed", explorerName: "罗宇航", explorationTeam: "四组" },
  { siteName: "伊滨区停车场光储充站", longitude: 112.6, latitude: 34.6, city: "洛阳市", district: "伊滨区", status: "draft", explorerName: "刘思远", explorationTeam: "四组" },
];

const inventorySeeds = [
  { stationName: "郑州市航空港区规划点A", city: "郑州市", district: "航空港区", route: "G107", location: "航空港区华夏大道东侧", longitude: 113.841, latitude: 34.521, status: 1, truck: 1860, heavy: 1210 },
  { stationName: "郑州市经开区规划点B", city: "郑州市", district: "经开区", route: "S102", location: "经开区经南八路北侧", longitude: 113.801, latitude: 34.719, status: 0, truck: 1430, heavy: 890 },
  { stationName: "开封市兰考县规划点A", city: "开封市", district: "兰考县", route: "G310", location: "兰考县产业集聚区", longitude: 114.819, latitude: 34.822, status: 0, truck: 980, heavy: 610 },
  { stationName: "洛阳市孟津区规划点A", city: "洛阳市", district: "孟津区", route: "G208", location: "孟津区麻屯镇物流园", longitude: 112.451, latitude: 34.831, status: 1, truck: 1240, heavy: 800 },
  { stationName: "平顶山市宝丰县规划点A", city: "平顶山市", district: "宝丰县", route: "S241", location: "宝丰县货运枢纽东侧", longitude: 113.049, latitude: 33.871, status: 0, truck: 870, heavy: 540 },
  { stationName: "安阳市汤阴县规划点A", city: "安阳市", district: "汤阴县", route: "G107", location: "汤阴县高速口北侧", longitude: 114.361, latitude: 35.919, status: 0, truck: 1320, heavy: 920 },
  { stationName: "鹤壁市山城区规划点A", city: "鹤壁市", district: "山城区", route: "G342", location: "山城区石林工业园", longitude: 114.179, latitude: 35.901, status: 1, truck: 760, heavy: 470 },
  { stationName: "新乡市原阳县规划点A", city: "新乡市", district: "原阳县", route: "G327", location: "原阳县产业集聚区", longitude: 113.941, latitude: 35.049, status: 0, truck: 1180, heavy: 730 },
  { stationName: "焦作市武陟县规划点A", city: "焦作市", district: "武陟县", route: "G327", location: "武陟县詹店镇物流园", longitude: 113.399, latitude: 35.101, status: 0, truck: 1050, heavy: 660 },
  { stationName: "濮阳市华龙区规划点A", city: "濮阳市", district: "华龙区", route: "G342", location: "华龙区工业园区", longitude: 115.071, latitude: 35.771, status: 1, truck: 910, heavy: 580 },
  { stationName: "许昌市建安区规划点A", city: "许昌市", district: "建安区", route: "G311", location: "建安区尚集镇停车场", longitude: 113.831, latitude: 34.119, status: 0, truck: 1260, heavy: 840 },
  { stationName: "漯河市召陵区规划点A", city: "漯河市", district: "召陵区", route: "G107", location: "召陵区东城产业集聚区", longitude: 114.101, latitude: 33.591, status: 0, truck: 1120, heavy: 700 },
  { stationName: "三门峡市陕州区规划点A", city: "三门峡市", district: "陕州区", route: "G310", location: "陕州区高速口西侧", longitude: 111.099, latitude: 34.721, status: 1, truck: 680, heavy: 430 },
  { stationName: "南阳市卧龙区规划点A", city: "南阳市", district: "卧龙区", route: "G312", location: "卧龙区龙升工业园", longitude: 112.531, latitude: 32.999, status: 0, truck: 970, heavy: 600 },
  { stationName: "商丘市梁园区规划点A", city: "商丘市", district: "梁园区", route: "G310", location: "梁园区物流园北侧", longitude: 115.609, latitude: 34.441, status: 0, truck: 1380, heavy: 950 },
  { stationName: "信阳市平桥区规划点A", city: "信阳市", district: "平桥区", route: "G312", location: "平桥区产业集聚区", longitude: 114.121, latitude: 32.101, status: 1, truck: 820, heavy: 510 },
  { stationName: "周口市川汇区规划点A", city: "周口市", district: "川汇区", route: "G311", location: "川汇区经济开发区", longitude: 114.649, latitude: 33.621, status: 0, truck: 1040, heavy: 650 },
  { stationName: "驻马店市驿城区规划点A", city: "驻马店市", district: "驿城区", route: "G107", location: "驿城区装备制造园", longitude: 114.021, latitude: 32.981, status: 0, truck: 1160, heavy: 720 },
  { stationName: "济源市玉泉街道规划点A", city: "济源市", district: "玉泉街道", route: "G208", location: "玉泉街道产业园", longitude: 112.611, latitude: 35.089, status: 1, truck: 640, heavy: 400 },
  { stationName: "洛阳市伊滨区规划点A", city: "洛阳市", district: "伊滨区", route: "S319", location: "伊滨区产业集聚区", longitude: 112.599, latitude: 34.601, status: 0, truck: 890, heavy: 550 },
];

function recommendationForScore(score: number): string {
  if (score >= 85) return "priority";
  if (score >= 75) return "recommended";
  if (score >= 60) return "cautious";
  return "paused";
}

function siteTimeline(status: string, index: number): { explorationDate: string; updatedAt: number } {
  const offset = status === "draft" ? 14 : 0;
  const date = new Date(Date.UTC(2026, 6, 15 + offset + index % 5));
  const hour = 17 - index % 8;
  const minute = index * 13 % 60;
  return {
    explorationDate: date.toISOString().slice(0, 10),
    updatedAt: Date.UTC(2026, 6, 29, hour, minute, 0) / 1000,
  };
}

async function count(pool: Pool, table: string): Promise<number> {
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM ${table}`);
  return Number(rows[0]?.total ?? 0);
}

export async function seedLocalDatabase(pool: Pool): Promise<Record<string, number>> {
  const now = Math.floor(Date.now() / 1000);
  const result: Record<string, number> = {};

  if (await count(pool, "platform_member") <= 1) {
    for (let index = 0; index < explorerNames.length; index += 1) {
      const name = explorerNames[index]!;
      await pool.query(
        `INSERT IGNORE INTO platform_member
           (auth_user_id, real_name, phone_number, email, status, protected_member, credentials_valid_after, created_at, updated_at)
         VALUES (?, ?, ?, NULL, 1, 0, 0, ?, ?)`,
        [`local-explorer-${index + 1}`, name, `13800000${String(101 + index)}`, now, now],
      );
    }
    result.members = explorerNames.length;
  }

  const teamIds = new Map<string, string>();
  if (await count(pool, "site_exploration_team") === 0) {
    for (const [index, name] of ["一组", "二组", "三组", "四组"].entries()) {
      const [insert] = await pool.query(
        `INSERT INTO site_exploration_team
           (name, description, status, created_by_member_id, updated_by_member_id, created_at, updated_at)
         VALUES (?, ?, 1, 1, 1, ?, ?)`,
        [name, `EVCS 本地开发勘探${name}`, now, now],
      );
      teamIds.set(name, String((insert as { insertId: number }).insertId));
    }
    result.teams = teamIds.size;
  } else {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT id, name FROM site_exploration_team ORDER BY id ASC");
    for (const row of rows) teamIds.set(String(row.name), String(row.id));
  }

  if (await count(pool, "site_exploration_team_member") === 0) {
    let inserted = 0;
    for (const [teamName, names] of Object.entries(teamMembers)) {
      const teamId = teamIds.get(teamName);
      if (!teamId) continue;
      for (const name of names) {
        const [memberRows] = await pool.query<RowDataPacket[]>(
          "SELECT id FROM platform_member WHERE real_name = ? LIMIT 1",
          [name],
        );
        const memberId = memberRows[0]?.id;
        if (!memberId) continue;
        await pool.query(
          `INSERT IGNORE INTO site_exploration_team_member
             (team_id, platform_member_id, created_by_member_id, created_at)
           VALUES (?, ?, 1, ?)`,
          [teamId, memberId, now],
        );
        inserted += 1;
      }
    }
    result.teamMembers = inserted;
  }

  if (await count(pool, "site_exploration_site") === 0) {
    for (const [index, seed] of siteSeeds.entries()) {
      const status = explorationStatusByKey[seed.status] ?? 1;
      const timeline = siteTimeline(seed.status, index);
      const draft = seed.status === "draft";
      const score = draft ? 0 : 76 + index * 5 % 21;
      const recommendation = draft ? 0 : recommendationByKey[recommendationForScore(score)] ?? 0;
      const teamId = teamIds.get(seed.explorationTeam) ?? "0";
      await pool.query(
        `INSERT INTO site_exploration_site
           (status, explorer_name, exploration_team, exploration_team_id, exploration_date,
            overall_score, overall_score_available, selection_recommendation,
            project_name, province_city, county_district, location_address, longitude, latitude,
            created_by_member_id, updated_by_member_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)`,
        [
          status, seed.explorerName, seed.explorationTeam, teamId, timeline.explorationDate,
          score, draft ? 0 : 1, recommendation,
          seed.siteName, seed.city, seed.district, `${seed.city}${seed.district}`, seed.longitude, seed.latitude,
          now, timeline.updatedAt,
        ],
      );
    }
    result.sites = siteSeeds.length;
  }

  if (await count(pool, "site_inventory_station") === 0) {
    for (const [index, seed] of inventorySeeds.entries()) {
      await pool.query(
        `INSERT INTO site_inventory_station
           (sequence_number, station_name, provincial_city, county_district, route_name, specific_location,
            facility_type, site_type, status, status_description, longitude, latitude,
            reference_station_id, reference_station_distance,
            daily_truck_traffic_2025, daily_medium_heavy_truck_traffic_2025, remark, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, '重卡充电站', 1, ?, ?, ?, ?, 0, 0, ?, ?, '', ?, ?)`,
        [
          index + 1, seed.stationName, seed.city, seed.district, seed.route, seed.location,
          seed.status, seed.status === 1 ? "已完成" : "待复核", seed.longitude, seed.latitude,
          seed.truck, seed.heavy, now, now,
        ],
      );
    }
    result.inventoryStations = inventorySeeds.length;
  }

  return result;
}

if (import.meta.main) {
  const pool = mysql.createPool({
    uri: databaseUrl,
    connectionLimit: 4,
    supportBigNumbers: true,
    bigNumberStrings: true,
    timezone: "Z",
    charset: "utf8mb4",
  });
  try {
    const summary = await seedLocalDatabase(pool);
    console.log(`Local seed complete: ${Object.entries(summary).map(([key, value]) => `${key}=${value}`).join(", ")}`);
  } finally {
    await pool.end();
  }
}

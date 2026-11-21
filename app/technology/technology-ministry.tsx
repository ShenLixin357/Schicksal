"use client";

import { useEffect, useState, type ReactNode } from "react";
import { PageHead } from "../shell/page-head";
import { MemberAccessSettings } from "../member-access-settings";
import "./technology-ministry.css";

/** The ministry uses the approved shared imperial mark, never a personal mark.
 * It does not create a ninth citizen; it has a separately authenticated minister identity.
 */
export function TechnologyMinistryPortal({ sharedMark, onOpenPhotos, onBack }: {
  sharedMark: ReactNode;
  onOpenPhotos: () => void;
  onBack: () => void;
}) {
  const [access, setAccess] = useState<"checking" | "authorized" | "denied">("checking");
  useEffect(() => {
    let live = true;
    fetch("/api/technology", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error("Access denied");
      if (live) setAccess("authorized");
    }).catch(() => { if (live) setAccess("denied"); });
    return () => { live = false; };
  }, []);
  return <section className="technology-ministry">
    <PageHead eyebrow="MINISTRY OF TECHNOLOGY" title="科技部 · 管理台"
      copy="管理权限属于现任科技部长公职；个人身份、职务标识与操作记录分别保存。" />
    <div className="technology-ministry-banner">
      <div className="technology-ministry-emblem" aria-hidden="true">{sharedMark}</div>
      <div><small>IMPERIAL SHARED EMBLEM</small><h2>天命第一帝国 · 科技部</h2>
        <p>部长拥有全站管理权限。当前只开放已完成服务端验证的管理操作；新增能力须逐项接入和审计。</p></div>
    </div>
    {access === "checking" ? <p role="status" className="technology-ministry-state">正在验证现任科技部部长身份…</p>
      : access === "denied" ? <p role="alert" className="technology-ministry-state">当前身份没有管理权限，或身份核验暂时失败。请重新登录后再试。</p>
      : <section className="technology-ministry-functions">
          <h3>档案管理</h3>
          <p>家庭影像馆的上传、照片编辑、回收与恢复仍按现有接口执行；完整隐私、历史审计及当事人权利规则尚待确认。</p>
          <button type="button" onClick={onOpenPhotos}>进入家庭影像馆管理 <span aria-hidden="true">→</span></button>
          <MemberAccessSettings />
        </section>}
    <button type="button" className="technology-ministry-back" onClick={onBack}>← 返回个人页</button>
  </section>;
}

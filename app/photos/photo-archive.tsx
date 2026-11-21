"use client";

import Image from "next/image";
import { useEffect, useState, type CSSProperties, type ReactNode, type Dispatch, type SetStateAction, type DragEvent, type FormEvent } from "react";
import { CITIZENS, citizenRepresentativeColor, type Citizen } from "../citizens";
import { PageHead } from "../shell/page-head";
import type { PublicMarkPlacement } from "../identity/mark-placements";
type PhotoMarkPlacement = Extract<PublicMarkPlacement, "photos-filter-subject" | "photos-upload-subject" | "photos-card-subject">;

/** The photo archive owns its own network operations and view state.
 * Identity marks and the imperial emblem arrive from the shell as approved
 * React nodes: this module never redraws, recolours or redefines them.
 */
type ArchivePhoto = {
  id: string;
  title: string;
  description: string;
  era: string;
  capturedAt: string;
  subjects: string[];
  subjectKey: string;
  uploaderCitizenId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  imageUrl: string;
};

const PHOTO_SUBJECTS = [{ id: "empire", username: "天命全体照", name: "Schicksal Group", accent: "#d6ad56", markColor: "#d6ad56", motif: "empire", office: "Group Archive", codename: "天命" }, ...CITIZENS] as Citizen[];

function PhotoSubjectMark({ subject, sharedMark, renderCitizenMark, placement }: {
  subject: Citizen; sharedMark: ReactNode; placement: PhotoMarkPlacement; renderCitizenMark: (subject: Citizen, placement: PhotoMarkPlacement) => ReactNode;
}) {
  if (subject.id === "empire") return <span className="archive-emblem" aria-hidden="true">{sharedMark}</span>;
  return <>{renderCitizenMark(subject, placement)}</>;
}

export function PhotoArchiveSection({ citizen, sharedMark, renderCitizenMark }: {
  citizen: Citizen; sharedMark: ReactNode; renderCitizenMark: (subject: Citizen, placement: PhotoMarkPlacement) => ReactNode;
}) {
  const renderSubjectMark = (subject: Citizen, placement: PhotoMarkPlacement) =>
    <PhotoSubjectMark subject={subject} sharedMark={sharedMark} placement={placement} renderCitizenMark={renderCitizenMark}/>;
  const [photos, setPhotos] = useState<ArchivePhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSubjects, setFilterSubjects] = useState<string[]>([]);
  const [uploadSubjects, setUploadSubjects] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [title, setTitle] = useState("");
  const [era, setEra] = useState("");
  const [capturedAt, setCapturedAt] = useState("");
  const [description, setDescription] = useState("");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/photos")
      .then(async (response) => {
        const body = await response.json() as { photos?: ArchivePhoto[]; error?: string };
        if (!response.ok) throw new Error(body.error || "影像馆暂时无法读取。");
        if (active) setPhotos(body.photos ?? []);
      })
      .catch((error: unknown) => { if (active) setStatus(error instanceof Error ? error.message : "影像馆暂时无法读取。"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const normalisedKey = (ids: string[]) => ids.includes("empire") ? "empire" : [...ids].sort().join("+");
  const activeFilterKey = normalisedKey(filterSubjects);
  const visiblePhotos = activeFilterKey ? photos.filter((photo) => photo.subjectKey === activeFilterKey) : photos;

  const toggleChoice = (id: string, update: Dispatch<SetStateAction<string[]>>) => {
    update((current) => {
      if (id === "empire") return current.includes("empire") ? [] : ["empire"];
      const withoutEmpire = current.filter((item) => item !== "empire");
      return withoutEmpire.includes(id) ? withoutEmpire.filter((item) => item !== id) : [...withoutEmpire, id];
    });
  };

  const chooseFile = (next: File | null) => {
    setStatus("");
    if (!next) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(next.type)) {
      setStatus("请选择 JPG、PNG、WEBP 或 GIF 照片。");
      return;
    }
    if (next.size > 12 * 1024 * 1024) {
      setStatus("单张照片不能超过 12 MB。");
      return;
    }
    setFile(next);
    setPreviewUrl(URL.createObjectURL(next));
    if (!title) setTitle(next.name.replace(/\.[^.]+$/, ""));
  };

  const dropFile = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    chooseFile(event.dataTransfer.files?.[0] ?? null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file || !title.trim() || !uploadSubjects.length) {
      setStatus("请完成照片、标题和人物标志三项必填内容。");
      return;
    }
    setUploading(true);
    setStatus("正在将照片收入影像馆…");
    try {
      const fileBytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (let offset = 0; offset < fileBytes.length; offset += 32_768) {
        binary += String.fromCharCode(...fileBytes.subarray(offset, offset + 32_768));
      }
      const dataBase64 = btoa(binary);
      const response = await fetch("/api/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataBase64,
          originalName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          title,
          era,
          capturedAt,
          description,
          subjects: uploadSubjects,
          uploaderCitizenId: citizen.id,
        }),
      });
      const body = await response.json() as { photo?: ArchivePhoto; error?: string };
      if (!response.ok || !body.photo) throw new Error(body.error || "照片上传失败。");
      setPhotos((current) => [body.photo!, ...current]);
      setFilterSubjects([...uploadSubjects]);
      setFile(null);
      setPreviewUrl("");
      setTitle("");
      setEra("");
      setCapturedAt("");
      setDescription("");
      setUploadSubjects([]);
      setStatus("照片已安全收入影像馆，并按所选标志完成分类。");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "照片上传失败，请稍后重试。");
    } finally {
      setUploading(false);
    }
  };

  const subjectFor = (id: string) => PHOTO_SUBJECTS.find((item) => item.id === id);
  const filterLabel = filterSubjects.length
    ? filterSubjects.map((id) => subjectFor(id)?.username ?? id).join(" + ")
    : "全部照片";

  return <>
    <PageHead eyebrow="Family Photo Archive" title="家庭影像馆" copy="上传共同记忆，并用个人标志标注照片中恰好出现的人；筛选采用精确人物组合，而不是模糊包含。" />
    <section className="photo-filters" aria-labelledby="photo-filter-title">
      <header><div><p className="eyebrow">Exact Combination</p><h2 id="photo-filter-title">标志筛选</h2></div><button type="button" onClick={() => setFilterSubjects([])} disabled={!filterSubjects.length}>查看全部 · CLEAR</button></header>
      <div className="mark-filter-row" role="group" aria-label="按人物标志筛选照片">
        {PHOTO_SUBJECTS.map((subject) => <button type="button" key={subject.id} className={filterSubjects.includes(subject.id) ? "selected" : ""} aria-pressed={filterSubjects.includes(subject.id)} onClick={() => toggleChoice(subject.id, setFilterSubjects)} style={{ "--citizen": citizenRepresentativeColor(subject) } as CSSProperties}>{renderSubjectMark(subject, "photos-filter-subject")}<span><strong>{subject.username}</strong><small>{subject.id === "empire" ? "全体合照" : subject.locked ? "身份待补" : "精确人物标签"}</small></span></button>)}
      </div>
      <p>当前分类：<strong>{filterLabel}</strong><span>{filterSubjects.length ? "只显示人物组合完全一致的照片" : "显示影像馆中的全部照片"}</span></p>
    </section>
    <div className="photo-workbench">
      <aside className="photo-uploader">
        <header><span>NEW ARCHIVE ENTRY</span><b>UPLOAD</b></header>
        <h2>上传一张照片</h2>
        <p>原图会被保存，人物标志用于之后的精确筛选。</p>
        <form onSubmit={submit}>
          <label className={`photo-dropzone ${dragging ? "dragging" : ""} ${previewUrl ? "has-photo" : ""}`} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={dropFile}>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} />
            {previewUrl ? <><Image src={previewUrl} alt="待上传照片预览" fill unoptimized /><span className="replace-photo">点击更换照片</span></> : <><span className="upload-glyph">＋</span><strong>选择或拖放照片</strong><small>JPG · PNG · WEBP · GIF / MAX 12 MB</small></>}
          </label>
          <label className="archive-field"><span>照片标题 *</span><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="例如：第一次国庆合照" required /></label>
          <div className="archive-field-pair">
            <label className="archive-field"><span>拍摄日期</span><input type="date" value={capturedAt} onChange={(event) => setCapturedAt(event.target.value)} /></label>
            <label className="archive-field"><span>年份 / 时期</span><input value={era} onChange={(event) => setEra(event.target.value)} maxLength={80} placeholder="例如：六人时期" /></label>
          </div>
          <label className="archive-field"><span>照片说明</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={800} rows={3} placeholder="这张照片发生了什么？由谁提供？" /></label>
          <fieldset className="upload-subjects"><legend>照片中恰好有哪些人 *</legend><p>若是当时全体成员的合照，请只选“天命全体照”。</p><div>{PHOTO_SUBJECTS.map((subject) => <button type="button" key={subject.id} className={uploadSubjects.includes(subject.id) ? "selected" : ""} aria-pressed={uploadSubjects.includes(subject.id)} onClick={() => toggleChoice(subject.id, setUploadSubjects)} title={subject.username} style={{ "--citizen": citizenRepresentativeColor(subject) } as CSSProperties}>{renderSubjectMark(subject, "photos-upload-subject")}<span>{subject.id === "empire" ? "天命" : subject.username}</span></button>)}</div></fieldset>
          <button className="primary archive-submit" type="submit" disabled={uploading}>{uploading ? "ARCHIVING…" : "收入影像馆"}<span>→</span></button>
          <p className="upload-status" role="status">{status || "上传后会自动切换到对应的标志分类。"}</p>
        </form>
      </aside>
      <section className="photo-gallery" aria-live="polite">
        <header><div><p className="eyebrow">Selected Collection</p><h2>{filterLabel}</h2></div><span>{visiblePhotos.length} / {photos.length} PHOTOS</span></header>
        {loading ? <div className="gallery-empty loading"><i /><h3>正在打开影像馆</h3><p>读取已保存的照片与分类信息…</p></div> : visiblePhotos.length === 0 ? <div className="gallery-empty"><span>S</span><h3>{photos.length ? "这个精确组合还没有照片" : "影像馆正在等待第一张照片"}</h3><p>{photos.length ? "可以更换上方标志组合，或上传一张属于这个组合的照片。" : "从左侧上传一张共同记忆，并为它选择人物标志。"}</p></div> : <div className="photo-grid">{visiblePhotos.map((photo) => <article className="photo-card" key={photo.id}>
          <figure><Image src={photo.imageUrl} alt={photo.title} fill sizes="(max-width: 760px) 100vw, (max-width: 1100px) 50vw, 32vw" /><figcaption>{photo.capturedAt || photo.era || "日期待补"}</figcaption></figure>
          <div className="photo-card-copy"><div className="photo-card-marks">{photo.subjects.map((id) => { const subject = subjectFor(id); return subject ? <span key={id} title={subject.username}>{renderSubjectMark(subject, "photos-card-subject")}</span> : null; })}</div><h3>{photo.title}</h3>{photo.description ? <p>{photo.description}</p> : <p className="muted">尚未填写照片说明。</p>}<footer><span>{photo.era || "时期待补"}</span><span>UPLOADED BY {subjectFor(photo.uploaderCitizenId)?.username ?? "CITIZEN"}</span></footer></div>
        </article>)}</div>}
      </section>
    </div>
    <p className="photo-privacy-note"><strong>PRIVACY NOTE</strong> 当前影像馆继承网站现有访问范围；正式开放给全部成员或长辈前，应继续确认照片当事人同意、查看范围与撤回机制。</p>
  </>;
}

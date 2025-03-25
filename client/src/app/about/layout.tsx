// 此文件可以删除，因为我们在 about/page.tsx 中已经实现了一致的布局
export default function ProjectLayout({ children }: { children: React.ReactNode }) {
    return (
        <>{children}</>
    );
}
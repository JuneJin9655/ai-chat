// components/ui/Sidebar.tsx
'use client'
import React, { useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

interface SidebarItem {
    name: string;
    href: string;
    icon?: React.ReactNode;
    children?: SidebarItem[];
}

const sidebarItems: SidebarItem[] = [
    { name: 'Home', href: '/' },
    {
        name: 'Project',
        href: '/projects',
        children: [
            { name: 'AI Chat', href: '/projects/ai' }
        ]
    },
    {
        name: 'Articles',
        href: '/articles',
        children: [
            { name: 'AI Chat', href: '/articles/AI Chat' }
        ]
    },
    { name: 'About Me', href: '/about' },
    { name: 'Contact Me', href: '/contact' }
];

// 辅助函数: 检查菜单项是否激活
const isItemActive = (itemPath: string, currentPath: string, isParent = false) => {
    return isParent
        ? currentPath === itemPath || currentPath.startsWith(itemPath + '/')
        : currentPath === itemPath;
};

const Sidebar: React.FC = () => {
    const { user, setShowLoginForm } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
    const [isMenuVisible, setIsMenuVisible] = useState(false);
    const [activeItems, setActiveItems] = useState<boolean[]>(Array(sidebarItems.length).fill(false));
    const animationInProgress = useRef(false);

    const animateItems = async (visible: boolean) => {
        if (animationInProgress.current) return;
        animationInProgress.current = true;

        const totalItems = sidebarItems.length;
        const newActiveItems = [...activeItems];

        if (visible) {
            for (let i = 0; i < totalItems; i++) {
                await new Promise(resolve => setTimeout(resolve, 100));
                newActiveItems[i] = true;
                setActiveItems([...newActiveItems]);
            }
        } else {
            for (let i = totalItems - 1; i >= 0; i--) {
                await new Promise(resolve => setTimeout(resolve, 100));
                newActiveItems[i] = false;
                setActiveItems([...newActiveItems]);
            }
        }

        animationInProgress.current = false;
    };

    const toggleMenu = async () => {
        const newVisibility = !isMenuVisible;
        setIsMenuVisible(newVisibility);
        animateItems(newVisibility);
    };

    const toggleExpand = (name: string) => {
        setExpandedItems(prev => ({
            ...prev,
            [name]: !prev[name]
        }));
    };

    // 处理需要认证的链接点击
    const handleProtectedLink = (e: React.MouseEvent, href: string) => {
        // 如果用户未登录，阻止默认导航
        if (!user) {
            e.preventDefault();
            // 显示登录表单
            setShowLoginForm(true);
            // 保存想要访问的路径
            localStorage.setItem('loginRedirect', href);
        }
        // 如果用户已登录，允许默认导航行为
    };

    // 渲染菜单项内容的函数
    const renderMenuItemContent = (item: SidebarItem, active: boolean, isChild = false) => {
        const baseClasses = `
            flex items-center ${isChild ? 'py-1 px-3' : 'px-2 py-2'} rounded-${isChild ? 'md' : 'lg'} 
            transition-all duration-${isChild ? '200' : '300'} cursor-pointer
            ${active
                ? `bg-white${isChild ? '/70' : ''} text-black`
                : `text-white${isChild ? '/80' : ''} hover:bg-white/10`
            }
            font-orbitron ${isChild ? 'text-sm' : 'text-lg'}
        `;

        return (
            <div className={baseClasses}>
                <span className='ml-2'>{item.name}</span>
            </div>
        );
    };

    return (
        <div className='relative h-full bg-transparent mt-24 flex flex-col'>
            <button
                onClick={toggleMenu}
                className="absolute top-0 ml-4 left-0 p-2 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 z-10"
            >
                <div className={`w-6 h-0.5 bg-white mb-1.5 transition-all duration-300 ${isMenuVisible ? 'rotate-45 translate-y-2' : ''}`}></div>
                <div className={`w-6 h-0.5 bg-white mb-1.5 transition-all duration-300 ${isMenuVisible ? 'opacity-0' : ''}`}></div>
                <div className={`w-6 h-0.5 bg-white transition-all duration-300 ${isMenuVisible ? '-rotate-45 -translate-y-2' : ''}`}></div>
            </button>

            <div className='py-16'>
                <ul className='space-y-4'>
                    {sidebarItems.map((item, index) => {
                        const isActive = isItemActive(item.href, pathname, true);
                        const isExpanded = !!expandedItems[item.name];
                        const hasChildren = !!item.children?.length;

                        return (
                            <li
                                key={item.name}
                                className={`
                                    relative
                                    transform transition-all duration-500 ease-in-out
                                    ${activeItems[index] ? 'translate-x-0 opacity-100' : '-translate-x-32 opacity-0'}
                                `}
                                style={{ transitionDelay: `${activeItems[index] ? index * 80 : (sidebarItems.length - index - 1) * 80}ms` }}
                            >
                                <div
                                    className={`
                                        flex items-center justify-between px-2 py-2 rounded-lg transition-all duration-300 cursor-pointer
                                        ${isActive ? 'bg-white text-black' : 'text-white hover:bg-white/10'}
                                        font-orbitron text-lg
                                    `}
                                    onClick={() => hasChildren ? toggleExpand(item.name) : null}
                                >
                                    {hasChildren ? (
                                        <div className="w-full flex items-center">
                                            <span className='ml-2'>{item.name}</span>
                                        </div>
                                    ) : (
                                        <Link href={item.href} className="w-full flex items-center">
                                            <span className='ml-2'>{item.name}</span>
                                        </Link>
                                    )}
                                </div>

                                {hasChildren && (
                                    <ul className={`
                                        overflow-hidden transition-all duration-300 pl-4 mt-1
                                        ${isExpanded ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}
                                    `}>
                                        {item.children?.map((child) => {
                                            const isChildActive = isItemActive(child.href, pathname);
                                            // 判断此链接是否需要认证
                                            const requiresAuth = child.href.startsWith('/projects/ai');

                                            return (
                                                <li key={child.name} className='my-1'>
                                                    <Link
                                                        href={child.href}
                                                        onClick={(e) => requiresAuth ? handleProtectedLink(e, child.href) : null}
                                                    >
                                                        <div className={`
                                                            flex items-center py-1 px-3 rounded-md transition-all duration-200
                                                            ${isChildActive ? 'bg-white/70 text-black' : 'text-white/80 hover:bg-white/10'}
                                                            text-sm font-orbitron
                                                        `}>
                                                            <span>{child.name}</span>
                                                        </div>
                                                    </Link>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
};

export default Sidebar;
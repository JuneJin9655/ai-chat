import { chatApi } from "@/lib/api";
import { ChatSession } from "@/types/chat";
import { useEffect, useState, useRef, useCallback } from "react";
import ReactDOM from "react-dom";

interface SessionListProps {
    sessions: ChatSession[];
    activeSession: ChatSession | null;
    onSelectSession: (session: ChatSession) => void;
    onCreateNewChat: () => void;
    onSessionDeleted: (deletedSessionId: string) => void;
}

interface ContextMenuProps {
    top: number;
    left: number;
    onDelete: () => void;
    onClose: () => void;
}

// 创建完全独立的上下文菜单组件
const ContextMenuPortal = ({ top, left, onDelete, onClose }: ContextMenuProps) => {
    // 使用useRef获取菜单DOM元素
    const menuRef = useRef<HTMLDivElement>(null);
    const [adjustedPosition, setAdjustedPosition] = useState({ top, left });

    // 调整菜单位置，确保不超出屏幕
    useEffect(() => {
        if (!menuRef.current) return;

        const menu = menuRef.current;
        const rect = menu.getBoundingClientRect();

        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        // 检查是否需要调整位置
        let newLeft = left;
        let newTop = top;

        // 右边界检查
        if (left + rect.width > windowWidth) {
            newLeft = left - rect.width;
        }

        // 下边界检查
        if (top + rect.height > windowHeight) {
            newTop = top - rect.height;
        }

        // 如果位置有变化，更新状态
        if (newLeft !== left || newTop !== top) {
            setAdjustedPosition({ top: newTop, left: newLeft });
        }
    }, [top, left, menuRef]);

    // 处理点击事件
    const handleClickOutside = useCallback((e: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
            onClose();
        }
    }, [onClose]);

    // 添加和清理全局事件监听
    useEffect(() => {
        // 延迟添加点击事件监听，避免立即触发
        const timer = setTimeout(() => {
            document.addEventListener('click', handleClickOutside);
            document.addEventListener('contextmenu', onClose);
            window.addEventListener('resize', onClose);
            window.addEventListener('scroll', onClose, true);
        }, 50);

        // 添加ESC键关闭
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            clearTimeout(timer);
            document.removeEventListener('click', handleClickOutside);
            document.removeEventListener('contextmenu', onClose);
            window.removeEventListener('resize', onClose);
            window.removeEventListener('scroll', onClose, true);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleClickOutside, onClose]);

    // 使用Portal将菜单渲染到body
    return ReactDOM.createPortal(
        <div
            ref={menuRef}
            className="fixed bg-gray-800 shadow-2xl rounded-md z-[9999] border border-gray-700"
            style={{
                top: `${adjustedPosition.top}px`,
                left: `${adjustedPosition.left}px`,
                minWidth: '180px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.6)'
            }}
            onClick={(e) => e.stopPropagation()}
        >
            <button
                className="w-full text-left px-4 py-3 text-white hover:bg-gray-700 transition-colors"
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                }}
            >
                Delete Chat Session
            </button>
        </div>,
        document.body
    );
};

const SessionList: React.FC<SessionListProps> = ({
    sessions,
    activeSession,
    onSelectSession,
    onCreateNewChat,
    onSessionDeleted
}) => {
    // 右键菜单状态
    const [contextMenu, setContextMenu] = useState<{
        visible: boolean;
        top: number;
        left: number;
        targetSessionId: string | null;
    }>({
        visible: false,
        top: 0,
        left: 0,
        targetSessionId: null
    });

    // 删除会话处理函数
    const handleDeleteChat = async (sessionId: string) => {
        if (!sessionId) return;

        try {
            await chatApi.deleteChat(sessionId);
            // 处理会话删除
            onSessionDeleted(sessionId);
        } catch (error) {
            console.error('Failed to delete chat session:', error);
        } finally {
            // 关闭上下文菜单
            closeContextMenu();
        }
    };

    // 处理右键点击
    const handleContextMenu = (e: React.MouseEvent, sessionId: string) => {
        // 阻止默认右键菜单和事件冒泡
        e.preventDefault();
        e.stopPropagation();

        // 显示自定义上下文菜单，直接使用客户端坐标
        setContextMenu({
            visible: true,
            top: e.clientY,
            left: e.clientX,
            targetSessionId: sessionId
        });
    };

    // 关闭上下文菜单
    const closeContextMenu = useCallback(() => {
        setContextMenu({
            visible: false,
            top: 0,
            left: 0,
            targetSessionId: null
        });
    }, []);

    return (
        <div className="w-full bg-white/5 backdrop-blur-sm rounded-lg shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] border border-white/20 p-4 h-full flex flex-col">
            <h2 className="text-white text-xl mb-4 font-orbitron text-center">Chat Sessions List</h2>

            <button
                onClick={onCreateNewChat}
                className="mb-4 bg-transparent text-white py-2 px-4 rounded font-orbitron hover:bg-white/10 border border-white/20"
            >
                New Chat
            </button>

            {/* 会话列表 */}
            <div className="flex-1 overflow-y-auto">
                {sessions && sessions.length > 0 ? (
                    sessions.map(session => (
                        <div
                            key={session.id}
                            className={`p-3 mb-2 rounded cursor-pointer ${activeSession?.id === session.id
                                ? 'bg-white/20 text-white'
                                : 'bg-white/10 text-white/80 hover:bg-white/15'
                                }`}
                            onClick={() => onSelectSession(session)}
                            onContextMenu={(e) => handleContextMenu(e, session.id)}
                        >
                            <div className="truncate font-medium">{session.title || 'New Chat'}</div>
                            <div className="text-xs opacity-70 mt-1 truncate">
                                {new Date(session.createdAt).toLocaleString()}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-white/70 text-center py-4 font-orbitron">
                        No Chat History Yet
                    </div>
                )}
            </div>

            {/* 使用Portal渲染上下文菜单 */}
            {contextMenu.visible && contextMenu.targetSessionId && (
                <ContextMenuPortal
                    top={contextMenu.top}
                    left={contextMenu.left}
                    onDelete={() => handleDeleteChat(contextMenu.targetSessionId!)}
                    onClose={closeContextMenu}
                />
            )}
        </div>
    );
};

export default SessionList;
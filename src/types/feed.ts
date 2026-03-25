export interface FeedItem {
    id: string;
    url: string;
    type: "photo" | "video";
    owner: {
        id: string;
        name: string;
        photo_url: string | null;
        role: string;
        plan?: string;
    };
    caption: string | null;
    isPremium: boolean;
    price: number;
    isUnlocked: boolean;
    createdAt?: string;
}

export interface Comment {
    id: string;
    photo_url: string;
    content: string;
    user_id: string;
    commenter: string;
    commenter_photo: string | null;
    created_at: string;
    parent_id: string | null;
}


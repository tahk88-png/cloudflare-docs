// Validation utilities for newsletter system

export function validateSubject(subject: string): { valid: boolean; error?: string } {
	if (!subject || subject.trim().length === 0) {
		return { valid: false, error: "Subject is required" };
	}
	if (subject.length > 60) {
		return { valid: false, error: "Subject must be 60 characters or less" };
	}
	return { valid: true };
}

export function validatePreheader(preheader: string | null): { valid: boolean; error?: string } {
	if (preheader && preheader.length > 100) {
		return { valid: false, error: "Preheader must be 100 characters or less" };
	}
	return { valid: true };
}

export function validateEmail(email: string): { valid: boolean; error?: string } {
	if (!email || email.trim().length === 0) {
		return { valid: false, error: "Email is required" };
	}
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(email)) {
		return { valid: false, error: "Invalid email format" };
	}
	return { valid: true };
}

export function validateBlocks(blocks: any[]): { valid: boolean; errors: string[] } {
	const errors: string[] = [];

	blocks.forEach((block, index) => {
		if (!block.type) {
			errors.push(`Block ${index + 1}: Type is required`);
		}
		if (!block.content) {
			errors.push(`Block ${index + 1}: Content is required`);
		}

		try {
			const content = JSON.parse(block.content);
			if (block.type === "image" && !content.image_id) {
			} // Image ID can be 0 initially
			if ((block.type === "paragraph" || block.type === "heading") && !content.text?.trim()) {
				errors.push(`Block ${index + 1}: Text content cannot be empty`);
			}
		} catch (e) {
			errors.push(`Block ${index + 1}: Invalid JSON content`);
		}
	});

	return {
		valid: errors.length === 0,
		errors,
	};
}

export function validateImageFile(file: File): { valid: boolean; error?: string } {
	const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
	if (!allowedTypes.includes(file.type)) {
		return {
			valid: false,
			error: "Invalid file type. Only JPG, PNG, and WEBP are allowed.",
		};
	}

	const maxSize = 5 * 1024 * 1024; // 5MB
	if (file.size > maxSize) {
		return { valid: false, error: "File size exceeds 5MB limit" };
	}

	return { valid: true };
}

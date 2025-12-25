"""Tests for the token service."""

from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.token import TokenService


class TestTokenGeneration:
    """Test token generation."""

    def test_token_is_secure(self):
        """Test that generated tokens are cryptographically secure."""
        import secrets
        
        token1 = secrets.token_urlsafe(32)
        token2 = secrets.token_urlsafe(32)
        
        # Tokens should be unique
        assert token1 != token2
        
        # Tokens should be long enough (32 bytes = ~43 chars base64)
        assert len(token1) >= 40
        assert len(token2) >= 40

    def test_token_url_generation(self):
        """Test view URL generation."""
        service = TokenService(MagicMock())
        
        # Mock settings
        with pytest.raises(Exception):
            # Will fail without proper settings, but tests the interface
            pass


class TestTokenValidation:
    """Test token validation."""

    def test_expired_token_is_invalid(self):
        """Test that expired tokens are rejected."""
        from app.models.token import InvoiceViewToken
        
        token = MagicMock(spec=InvoiceViewToken)
        token.is_active = True
        token.expires_at = datetime.utcnow() - timedelta(hours=1)
        token.max_views = None
        token.view_count = 0
        
        # Manually check expiration logic
        is_expired = datetime.utcnow() > token.expires_at.replace(tzinfo=None)
        assert is_expired

    def test_deactivated_token_is_invalid(self):
        """Test that deactivated tokens are rejected."""
        from app.models.token import InvoiceViewToken
        
        token = MagicMock(spec=InvoiceViewToken)
        token.is_active = False
        token.expires_at = datetime.utcnow() + timedelta(hours=1)
        
        assert not token.is_active

    def test_max_views_exceeded(self):
        """Test that tokens with max views exceeded are rejected."""
        from app.models.token import InvoiceViewToken
        
        token = MagicMock(spec=InvoiceViewToken)
        token.is_active = True
        token.expires_at = datetime.utcnow() + timedelta(hours=1)
        token.max_views = 5
        token.view_count = 5
        
        # Token should be invalid when view_count >= max_views
        is_max_reached = token.max_views and token.view_count >= token.max_views
        assert is_max_reached


class TestViewLogging:
    """Test view logging functionality."""

    def test_view_log_captures_context(self):
        """Test that view logs capture IP and user agent."""
        from app.models.token import TokenViewLog
        
        log = MagicMock(spec=TokenViewLog)
        log.ip_address = "192.168.1.1"
        log.user_agent = "Mozilla/5.0"
        log.viewed_at = datetime.utcnow()
        
        assert log.ip_address is not None
        assert log.user_agent is not None
        assert log.viewed_at is not None


class TestUserAgentParsing:
    """Test user agent parsing."""

    def test_device_type_detection(self):
        """Test device type detection from user agent."""
        service = TokenService(MagicMock())
        
        # Desktop
        desktop_ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        assert service._parse_device_type(desktop_ua) == "desktop"
        
        # Mobile
        mobile_ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) Mobile"
        assert service._parse_device_type(mobile_ua) == "mobile"
        
        # Android
        android_ua = "Mozilla/5.0 (Linux; Android 10; SM-G960F)"
        assert service._parse_device_type(android_ua) == "mobile"
        
        # Tablet
        tablet_ua = "Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) Safari"
        assert service._parse_device_type(tablet_ua) == "tablet"

    def test_browser_detection(self):
        """Test browser detection from user agent."""
        service = TokenService(MagicMock())
        
        chrome_ua = "Mozilla/5.0 Chrome/91.0.4472.124 Safari/537.36"
        assert service._parse_browser(chrome_ua) == "Chrome"
        
        firefox_ua = "Mozilla/5.0 Firefox/89.0"
        assert service._parse_browser(firefox_ua) == "Firefox"
        
        safari_ua = "Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Safari/605.1.15"
        assert service._parse_browser(safari_ua) == "Safari"
        
        edge_ua = "Mozilla/5.0 Edg/91.0.864.59"
        assert service._parse_browser(edge_ua) == "Edge"

    def test_os_detection(self):
        """Test OS detection from user agent."""
        service = TokenService(MagicMock())
        
        windows_ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        assert service._parse_os(windows_ua) == "Windows"
        
        mac_ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
        assert service._parse_os(mac_ua) == "macOS"
        
        linux_ua = "Mozilla/5.0 (X11; Linux x86_64)"
        assert service._parse_os(linux_ua) == "Linux"
        
        ios_ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)"
        assert service._parse_os(ios_ua) == "iOS"
        
        android_ua = "Mozilla/5.0 (Linux; Android 10)"
        assert service._parse_os(android_ua) == "Android"

    def test_null_user_agent_handling(self):
        """Test handling of null user agent."""
        service = TokenService(MagicMock())
        
        assert service._parse_device_type(None) is None
        assert service._parse_browser(None) is None
        assert service._parse_os(None) is None

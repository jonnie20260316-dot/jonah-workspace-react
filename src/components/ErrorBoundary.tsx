import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { pick } from "../utils/i18n";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] 元件崩潰:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            gap: "12px",
            background: "rgba(220,38,38,0.06)",
            border: "1px solid rgba(220,38,38,0.2)",
            borderRadius: "8px",
            color: "var(--text-secondary, #555)",
            fontSize: "13px",
          }}
        >
          <span style={{ fontSize: "20px" }}>⚠️</span>
          <span>{pick("這個區塊發生了錯誤", "Something went wrong here")}</span>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: undefined });
              window.location.reload();
            }}
            style={{
              padding: "6px 14px",
              borderRadius: "6px",
              border: "1px solid rgba(220,38,38,0.3)",
              background: "transparent",
              cursor: "pointer",
              fontSize: "12px",
              color: "var(--text-secondary, #555)",
            }}
          >
            {pick("重新載入", "Reload")}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Pull-to-refresh in Towinly colours (UX-704). tintColor paints iOS only;
// Android reads `colors` and would fall back to default gray without it, so
// both are set here, with the spinner puck on the plain page surface. The
// colour props sit after the spread so a call site cannot drift the look —
// screens wire only refreshing/onRefresh.
import { RefreshControl as NativeRefreshControl } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

export default function RefreshControl(props) {
  const { t } = useTheme();
  return (
    <NativeRefreshControl
      {...props}
      tintColor={t.blue}
      colors={[t.blue]}
      progressBackgroundColor={t.surface}
    />
  );
}

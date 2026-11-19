/**
 * Directives: the numbered policy library. Home is the index (sortable by number,
 * OPR, effective date, status), the supersession view and the acknowledgement record;
 * a directive route opens the reader with paragraph deep links (#para-6),
 * acknowledgement of reading, supersession chain and print.
 */
import type { AppProps } from '@core/contracts';
import { useServices } from '@core/services';
import './directives.css';
import { Home } from './Home';
import { Reader } from './Reader';

export default function App(props: AppProps) {
  const services = useServices();
  const { route } = props;
  if (!route) return <Home {...props} services={services} />;
  return <Reader key={route.id} win={props.win} route={route} services={services} />;
}

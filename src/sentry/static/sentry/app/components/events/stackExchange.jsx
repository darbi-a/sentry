import React from 'react';
import {Flex, Box} from 'grid-emotion';
import PropTypes from 'prop-types';
import styled from 'react-emotion';
import $ from 'jquery';
import queryString from 'query-string';
import _ from 'lodash';

import Count from 'app/components/count';
import {Panel, PanelBody, PanelItem} from 'app/components/panels';
import ToolbarHeader from 'app/components/toolbarHeader';
import {t} from 'app/locale';
import SentryTypes from 'app/sentryTypes';
import withApi from 'app/utils/withApi';
import space from 'app/styles/space';
import GuideAnchor from 'app/components/assistant/guideAnchor';
import DropdownAutoComplete from 'app/components/dropdownAutoComplete';
import EmptyMessage from 'app/views/settings/components/emptyMessage';

class GenerateQuery extends React.Component {
  static propTypes = {
    api: PropTypes.object.isRequired,
    organization: SentryTypes.Organization.isRequired,
    project: SentryTypes.Project.isRequired,
    event: SentryTypes.Event.isRequired,
  };

  state = {
    query: '',
    loading: true,
    error: null,
  };

  // eslint-disable-next-line react/sort-comp
  _isMounted = false;

  componentDidMount() {
    this._isMounted = true;

    this.fetchData();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  fetchData = () => {
    const {api, project, organization, event} = this.props;

    this.setState({
      loading: true,
    });

    api.request(
      `/projects/${organization.slug}/${project.slug}/events/${event.id}/stackexchange/`,
      {
        success: data => {
          if (!this._isMounted) {
            return;
          }

          const query = _.get(data, ['query'], '');

          this.setState({
            query: _.isString(query) ? query : '',
            loading: false,
            error: null,
          });
        },
        error: err => {
          if (!this._isMounted) {
            return;
          }

          this.setState({
            query: '',
            questions: [],
            loading: false,
            error: err,
          });
        },
      }
    );
  };

  render() {
    if (this.state.loading) {
      return null;
    }

    if (!!this.state.error) {
      return null;
    }

    const childProps = {
      query: this.state.query,
    };

    return this.props.children(childProps);
  }
}

class StackExchangeSites extends React.Component {
  state = {
    sites: [],
    loading: true,
    error: null,
    currentSite: {
      name: 'Stack Overflow',
      api_site_parameter: 'stackoverflow',
      icon: 'https://cdn.sstatic.net/Sites/stackoverflow/img/apple-touch-icon.png',
      site_url: 'https://stackoverflow.com',
    },
  };

  // eslint-disable-next-line react/sort-comp
  _isMounted = false;

  componentDidMount() {
    this._isMounted = true;

    this.fetchData();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  fetchData = () => {
    const request = {
      url: 'https://api.stackexchange.com/2.2/sites',
      method: 'GET',
    };

    // We can't use the API client here since the URL is not scoped under the
    // API endpoints (which the client prefixes)
    $.ajax(request)
      .then(results => {
        if (!this._isMounted) {
          return;
        }

        this.setState({
          sites: results.items,
          loading: false,
          error: null,
        });
      })
      .fail(err => {
        if (!this._isMounted) {
          return;
        }

        this.setState({
          sites: [],
          loading: false,
          error: err,
        });
      });
  };

  onSelect = ({value}) => {
    const site = value;
    this.setState({
      currentSite: {
        name: site.name,
        api_site_parameter: site.api_site_parameter,
        icon: site.icon_url,
        site_url: site.site_url,
      },
    });
  };

  generateMenuList = () => {
    return this.state.sites.map(site => {
      return {
        value: site,
        searchKey: site.name,
        label: (
          <span>
            <img height="20" width="20" src={site.icon_url} /> {String(site.name)}
          </span>
        ),
      };
    });
  };

  render() {
    if (this.state.loading) {
      return null;
    }

    if (!!this.state.error) {
      return null;
    }

    const childProps = {
      sites: this.state.sites,
      menuList: this.generateMenuList(),
      onSelect: this.onSelect,
      currentSite: this.state.currentSite,
    };

    return this.props.children(childProps);
  }
}
class EventStackExchange extends React.PureComponent {
  static propTypes = {
    // api: PropTypes.object.isRequired,
    // organization: SentryTypes.Organization.isRequired,
    // project: SentryTypes.Project.isRequired,
    event: SentryTypes.Event.isRequired,

    query: PropTypes.string.isRequired,

    // TODO: remove me
    // menuList: PropTypes.arrayOf(
    //   PropTypes.shape({
    //     value: PropTypes.object.isRequired,
    //     searchKey: PropTypes.string.isRequired,
    //     label: PropTypes.object.isRequired,
    //   }).isRequired
    // ).isRequired,

    currentSite: PropTypes.shape({
      name: PropTypes.string.isRequired,
      api_site_parameter: PropTypes.string.isRequired,
      icon: PropTypes.string.isRequired,
      site_url: PropTypes.string.isRequired,
    }).isRequired,

    // TODO: remove me
    // onSelect: PropTypes.func.isRequired,
  };

  state = {
    questions: [],
    loading: true,
    error: null,
  };

  // eslint-disable-next-line react/sort-comp
  _isMounted = false;

  componentDidMount() {
    this._isMounted = true;

    this.fetchData();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  fetchData = () => {
    const {query, event} = this.props;

    const params = {
      q: query,
      order: 'desc',
      sort: 'relevance',
      site: this.props.currentSite.api_site_parameter,
      tagged: event.platform,
    };

    const request = {
      url: `https://api.stackexchange.com/2.2/search/advanced?${queryString.stringify(
        params
      )}`,
      method: 'GET',
    };

    // We can't use the API client here since the URL is not scoped under the
    // API endpoints (which the client prefixes)
    $.ajax(request)
      .then(results => {
        if (!this._isMounted) {
          return;
        }

        this.setState({
          questions: results.items,
          loading: false,
          error: null,
        });
      })
      .fail(err => {
        if (!this._isMounted) {
          return;
        }

        this.setState({
          questions: [],
          loading: false,
          error: err,
        });
      });
  };

  // ___fetchData = () => {
  //   const {api, project, organization, event} = this.props;

  //   this.setState({
  //     loading: true,
  //   });

  //   api.request(
  //     `/projects/${organization.slug}/${project.slug}/events/${event.id}/stackexchange/`,
  //     {
  //       success: data => {
  //         if (!this._isMounted) {
  //           return;
  //         }

  //         const params = {
  //           q: data.query,
  //           order: 'desc',
  //           sort: 'relevance',
  //           site: this.props.currentSite.api_site_parameter,
  //           tagged: event.platform,
  //         };

  //         const request = {
  //           url: `https://api.stackexchange.com/2.2/search/advanced?${queryString.stringify(
  //             params
  //           )}`,
  //           method: 'GET',
  //         };

  //         // We can't use the API client here since the URL is not scoped under the
  //         // API endpoints (which the client prefixes)
  //         $.ajax(request)
  //           .then(results => {
  //             if (!this._isMounted) {
  //               return;
  //             }

  //             this.setState({
  //               query: data.query,
  //               questions: results.items,
  //               loading: false,
  //               error: null,
  //             });
  //           })
  //           .fail(err => {
  //             if (!this._isMounted) {
  //               return;
  //             }

  //             this.setState({
  //               query: '',
  //               questions: [],
  //               loading: false,
  //               error: err,
  //             });
  //           });

  //         // this.setState({
  //         //   query: data.query,
  //         //   questions: data.results.items,
  //         //   loading: false,
  //         // });
  //       },
  //       error: err => {
  //         if (!this._isMounted) {
  //           return;
  //         }

  //         this.setState({
  //           query: '',
  //           questions: [],
  //           loading: false,
  //           error: err,
  //         });
  //       },
  //     }
  //   );
  // };

  renderHeaders() {
    return (
      <Sticky>
        <StyledFlex py={1}>
          <Box w={[8 / 12, 8 / 12, 6 / 12]} mx={1} flex="1">
            <ToolbarHeader>{t('Question')}</ToolbarHeader>
          </Box>
          <Box w={16} mx={2} className="align-right" />
          <Box w={[40, 60, 80, 80]} mx={2} className="align-right">
            <ToolbarHeader>{t('Answers')}</ToolbarHeader>
          </Box>
          <Box w={[40, 60, 80, 80]} mx={2} className="align-right">
            <ToolbarHeader>{t('Views')}</ToolbarHeader>
          </Box>
        </StyledFlex>
      </Sticky>
    );
  }

  decode(escapedHtml) {
    const doc = new DOMParser().parseFromString(escapedHtml, 'text/html');
    return doc.documentElement.textContent;
  }

  renderStackExchangeQuestion = question => {
    const hasAcceptedAnswer = !!question.accepted_answer_id;

    // if there is an accepted answer, we link to it, otherwise, we link to the
    // stackoverflow question
    const question_link = hasAcceptedAnswer
      ? `${this.props.currentSite.site_url}/a/${question.accepted_answer_id}`
      : question.link;

    return (
      <Group key={question.question_id} py={1} px={0} align="center">
        <Box w={[8 / 12, 8 / 12, 6 / 12]} mx={1} flex="1">
          <QuestionWrapper>
            {hasAcceptedAnswer && (
              <div style={{color: '#57be8c'}}>
                <span className="icon-checkmark" />
              </div>
            )}
            <a href={question_link} target="_blank" rel="noopener noreferrer">
              {this.decode(question.title)}
            </a>
          </QuestionWrapper>
          <StyledTags>
            {question.tags.map(tag => (
              <a
                className="btn btn-default btn-sm"
                key={tag}
                href={`${this.props.currentSite.site_url}/questions/tagged/${tag}`}
                rel="noopener noreferrer"
                target="_blank"
              >
                {tag}
              </a>
            ))}
          </StyledTags>
        </Box>
        <Flex w={[40, 60, 80, 80]} mx={2} justify="flex-end">
          <StyledCount value={question.answer_count} />
        </Flex>
        <Flex w={[40, 60, 80, 80]} mx={2} justify="flex-end">
          <StyledCount value={question.view_count} />
        </Flex>
      </Group>
    );
  };

  renderAskOnStackOverflow() {
    const {platform} = this.props.event;

    return (
      <a
        className="btn btn-default btn-sm"
        href={`${
          this.props.currentSite.site_url
        }/questions/ask?tags=${platform}&title=${encodeURIComponent(this.state.query)}`}
        rel="noopener noreferrer"
        target="_blank"
      >
        {t(`Don't see your issue? Ask on ${this.props.currentSite.name}!`)}
      </a>
    );
  }

  renderSeeMoreResults() {
    const {platform} = this.props.event;

    const query = `[${platform}] ${this.state.query}`;

    return (
      <a
        className="btn btn-default btn-sm"
        href={`${this.props.currentSite.site_url}/search?q=${encodeURIComponent(query)}`}
        rel="noopener noreferrer"
        target="_blank"
      >
        See more results
      </a>
    );
  }

  renderBody = () => {
    const top3 = this.state.questions.slice(0, 3);

    if (top3.length <= 0) {
      return <EmptyMessage>{t('No results')}</EmptyMessage>;
    }

    return <PanelBody>{top3.map(this.renderStackExchangeQuestion)}</PanelBody>;
  };

  render() {
    if (this.state.loading) {
      return null;
    }

    if (!!this.state.error) {
      return null;
    }

    return (
      <React.Fragment>
        <Panel>
          {this.renderHeaders()}
          {this.renderBody()}
        </Panel>
        <ButtonListControls>
          {this.renderAskOnStackOverflow()}
          {this.renderSeeMoreResults()}
        </ButtonListControls>
      </React.Fragment>
    );
  }
}

const Foobar = props => {
  const {api, organization, project, event} = props;

  return (
    <GenerateQuery {...{api, organization, project, event}}>
      {({query}) => {
        return (
          <StackExchangeSites>
            {({sites, menuList, onSelect, currentSite}) => {
              return (
                <div className="extra-data box">
                  <div className="box-header">
                    <a href="#stackexchange" className="permalink">
                      <em className="icon-anchor" />
                    </a>
                    <GuideAnchor target="stackexchange" type="text" />
                    <h3>
                      <DropdownAutoComplete
                        items={menuList}
                        alignMenu="left"
                        onSelect={onSelect}
                      >
                        {({isOpen, selectedItem}) => {
                          return selectedItem ? (
                            selectedItem.label
                          ) : (
                            <span>
                              <img height="20" width="20" src={currentSite.icon} />{' '}
                              {String(currentSite.name)}
                            </span>
                          );
                        }}
                      </DropdownAutoComplete>
                    </h3>

                    <EventStackExchange
                      key={currentSite.api_site_parameter}
                      sites={sites}
                      menuList={menuList}
                      onSelect={onSelect}
                      currentSite={currentSite}
                      {...props}
                    />
                  </div>
                </div>
              );
            }}
          </StackExchangeSites>
        );
      }}
    </GenerateQuery>
  );
};

const Group = styled(PanelItem)`
  line-height: 1.1;
`;

const Sticky = styled('div')`
  position: sticky;
  z-index: ${p => p.theme.zIndex.header};
  top: -1px;
`;

const StyledFlex = styled(Flex)`
  align-items: center;
  background: ${p => p.theme.offWhite};
  border-bottom: 1px solid ${p => p.theme.borderDark};
  border-radius: ${p => p.theme.borderRadius} ${p => p.theme.borderRadius} 0 0;
  margin-bottom: -1px;
`;

const StyledCount = styled(Count)`
  font-size: 18px;
  color: ${p => p.theme.gray3};
`;

const ButtonList = styled('div')`
  > * + * {
    margin-left: ${space(1)};
  }
`;

const StyledTags = styled(ButtonList)`
  margin-top: ${space(1)};
  margin-bottom: ${space(1)};
`;

const ButtonListControls = styled(ButtonList)`
  margin-top: -${space(1)};
  margin-bottom: ${space(3)};
`;

const QuestionWrapper = styled('div')`
  display: flex;
  align-items: center;

  padding-top: ${space(1)};
  padding-bottom: ${space(1)};

  > * + * {
    margin-left: ${space(1)};
  }
`;

export default withApi(Foobar);